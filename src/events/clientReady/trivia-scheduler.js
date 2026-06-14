const cron = require("node-cron");
const https = require("https");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const TriviaConfig = require("../../schemas/TriviaConfig");
const TriviaStats = require("../../schemas/TriviaStats");
const logger = require("../../extra/logger");

function decodeHtml(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&");
}

function fetchQuestion(difficulty, categoryId) {
  return new Promise((resolve, reject) => {
    let path = `/api.php?amount=1&type=multiple`;
    if (difficulty && difficulty !== "random") path += `&difficulty=${difficulty}`;
    if (categoryId) path += `&category=${categoryId}`;

    const options = {
      hostname: "opentdb.com",
      path,
      method: "GET",
    };

    https
      .get(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.response_code !== 0 || !parsed.results?.length) {
              reject(new Error(`OpenTDB response_code: ${parsed.response_code}`));
            } else {
              resolve(parsed.results[0]);
            }
          } catch {
            reject(new Error("Failed to parse OpenTDB response"));
          }
        });
      })
      .on("error", reject);
  });
}

function getTodayInTimezone(timezone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

function getCurrentHHMM(timezone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

const BASE_PAYOUT = { easy: 25, medium: 75, hard: 150 };

module.exports = (client) => {
  cron.schedule("* * * * *", async () => {
    let configs;
    try {
      configs = await TriviaConfig.find({ enabled: true });
    } catch (err) {
      logger.error("trivia-scheduler: failed to fetch configs:", err);
      return;
    }

    for (const cfg of configs) {
      try {
        const currentTime = getCurrentHHMM(cfg.timezone);
        if (currentTime !== cfg.time) continue;

        const today = getTodayInTimezone(cfg.timezone);
        if (cfg.lastSentDate === today) continue;

        // Announce previous day's winners before posting new question
        if (cfg.lastSentDate) {
          try {
            const winners = await TriviaStats.find({
              guildId: cfg.guildId,
              questionId: cfg.lastSentDate,
              solved: true,
            }).sort({ wrongAttempts: 1 });

            const guild =
              client.guilds.cache.get(cfg.guildId) ||
              (await client.guilds.fetch(cfg.guildId).catch(() => null));

            const channel = guild
              ? guild.channels.cache.get(cfg.channelId) ||
                (await guild.channels.fetch(cfg.channelId).catch(() => null))
              : null;

            if (channel) {
              if (!winners.length) {
                const noWinnersEmbed = new EmbedBuilder()
                  .setColor("Red")
                  .setTitle("📋 Yesterday's Trivia Results")
                  .setDescription("nobody got it right. embarrassing, all of you.")
                  .setFooter({ text: cfg.lastSentDate });
                await channel.send({ embeds: [noWinnersEmbed] });
              } else {
                const lines = await Promise.all(
                  winners.map(async (s) => {
                    const user = await client.users.fetch(s.userId).catch(() => null);
                    const name = user ? `<@${s.userId}>` : s.userId;
                    const attempts = s.wrongAttempts + 1;
                    return attempts === 1
                      ? `${name} — first try. fine.`
                      : `${name} — ${attempts} attempts. took long enough.`;
                  })
                );
                const winnersEmbed = new EmbedBuilder()
                  .setColor("Blurple")
                  .setTitle("📋 Yesterday's Trivia Results")
                  .setDescription(`here's who actually got it right:\n\n${lines.join("\n")}`)
                  .setFooter({ text: cfg.lastSentDate });
                await channel.send({ embeds: [winnersEmbed] });
              }
            }
          } catch (err) {
            logger.error(`trivia-scheduler: failed to announce winners for guild ${cfg.guildId}:`, err);
          }
        }

        let categoryId = null;
        if (cfg.categoryIds.length > 0) {
          categoryId = cfg.categoryIds[Math.floor(Math.random() * cfg.categoryIds.length)];
        }

        const effectiveDifficulty =
          cfg.difficulty === "random"
            ? ["easy", "medium", "hard"][Math.floor(Math.random() * 3)]
            : cfg.difficulty;

        let question;
        try {
          question = await fetchQuestion(effectiveDifficulty, categoryId);
        } catch (err) {
          logger.error(`trivia-scheduler: failed to fetch question for guild ${cfg.guildId}:`, err);
          continue;
        }

        const correctAnswer = decodeHtml(question.correct_answer);
        const allAnswers = [
          correctAnswer,
          ...question.incorrect_answers.map(decodeHtml),
        ].sort(() => Math.random() - 0.5);

        const questionText = decodeHtml(question.question).toLowerCase();
        const requiresChoices = /which of the following|which one of the following|which of these|all of the following|none of the following|which is not|which are not|which was not|which were not/.test(questionText);

        const basePayout = BASE_PAYOUT[effectiveDifficulty] ?? 75;

        const guild =
          client.guilds.cache.get(cfg.guildId) ||
          (await client.guilds.fetch(cfg.guildId).catch(() => null));
        if (!guild) {
          logger.error(`trivia-scheduler: guild ${cfg.guildId} not found`);
          continue;
        }

        const channel =
          guild.channels.cache.get(cfg.channelId) ||
          (await guild.channels.fetch(cfg.channelId).catch(() => null));
        if (!channel) {
          logger.error(`trivia-scheduler: channel ${cfg.channelId} not found in guild ${cfg.guildId}`);
          continue;
        }

        // Disable button on old message
        if (cfg.lastMessageId) {
          const oldMessage = await channel.messages.fetch(cfg.lastMessageId).catch(() => null);
          if (oldMessage) {
            const disabledButton = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("trivia_expired")
                .setLabel("Submissions Closed")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );
            await oldMessage.edit({ components: [disabledButton] }).catch(() => {});
          }
        }

        const difficultyEmoji = { easy: "🟢", medium: "🟡", hard: "🔴" };

        const embed = new EmbedBuilder()
          .setColor("Blurple")
          .setTitle("📚 Daily Trivia Question")
          .setDescription(`**${decodeHtml(question.question)}**`)
          .addFields(
            { name: "Category", value: decodeHtml(question.category), inline: true },
            {
              name: "Difficulty",
              value: `${difficultyEmoji[effectiveDifficulty] ?? ""} ${effectiveDifficulty}`,
              inline: true,
            },
            { name: "Base Payout", value: `${basePayout} rice grains`, inline: true },
            ...(requiresChoices ? [{ name: "Choices", value: allAnswers.map((a, i) => `${["🅐","🅑","🅒","🅓"][i]} ${a}`).join("\n") }] : [])
          )
          .setFooter({ text: "Click Submit Answer to enter your answer. All correct submissions win!" })
          .setTimestamp();

        const button = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`trivia_answer_${cfg.guildId}_${today}`)
            .setLabel("Submit Answer")
            .setStyle(ButtonStyle.Primary)
        );

        const sentMessage = await channel.send({ embeds: [embed], components: [button] });

        cfg.lastSentDate = today;
        cfg.correctAnswer = correctAnswer;
        cfg.questionDifficulty = effectiveDifficulty;
        cfg.lastMessageId = sentMessage.id;
        await cfg.save();
      } catch (err) {
        logger.error(`trivia-scheduler: error processing guild ${cfg.guildId}:`, err);
      }
    }
  });
};
