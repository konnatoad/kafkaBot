const cron = require("node-cron");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const TriviaConfig = require("../../schemas/TriviaConfig");
const TriviaStats = require("../../schemas/TriviaStats");
const logger = require("../../extra/logger");
const { BASE_PAYOUT, fetchQuestion } = require("../../utils/trivia");
const { pickOne, shuffle } = require("../../utils/random");

function getTodayInTimezone(timezone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date(),
  );
}

function getCurrentHHMM(timezone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

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
          logger.error(
            `trivia-scheduler: channel ${cfg.channelId} not found in guild ${cfg.guildId}`,
          );
          continue;
        }

        // Announce previous day's winners before posting new question
        if (cfg.lastSentDate) {
          try {
            const winners = await TriviaStats.find({
              guildId: cfg.guildId,
              questionId: cfg.lastSentDate,
              solved: true,
            }).sort({ wrongAttempts: 1 });

            const results = new EmbedBuilder()
              .setTitle("📋 Yesterday's Trivia Results")
              .setFooter({ text: cfg.lastSentDate });
            if (!winners.length) {
              results
                .setColor("Red")
                .setDescription(
                  "nobody got it right. embarrassing, all of you.",
                );
            } else {
              const lines = winners.map(({ userId, wrongAttempts }) =>
                wrongAttempts === 0
                  ? `<@${userId}> — first try. fine.`
                  : `<@${userId}> — ${wrongAttempts + 1} attempts. took long enough.`,
              );
              results
                .setColor("Blurple")
                .setDescription(
                  `here's who actually got it right:\n\n${lines.join("\n")}`,
                );
            }
            await channel.send({ embeds: [results] });
          } catch (err) {
            logger.error(
              `trivia-scheduler: failed to announce winners for guild ${cfg.guildId}:`,
              err,
            );
          }
        }

        const categoryId = cfg.categoryIds.length
          ? pickOne(cfg.categoryIds)
          : null;
        const effectiveDifficulty =
          cfg.difficulty === "random"
            ? pickOne(["easy", "medium", "hard"])
            : cfg.difficulty;

        let question;
        try {
          question = await fetchQuestion(effectiveDifficulty, categoryId);
        } catch (err) {
          logger.error(
            `trivia-scheduler: failed to fetch question for guild ${cfg.guildId}:`,
            err,
          );
          continue;
        }

        const { correctAnswer } = question;
        const allAnswers = shuffle([
          correctAnswer,
          ...question.incorrectAnswers,
        ]);

        const questionText = question.question.toLowerCase();
        const requiresChoices =
          /which of the following|which one of the following|which of these|all of the following|none of the following|which is not|which are not|which was not|which were not/.test(
            questionText,
          );

        const basePayout = BASE_PAYOUT[effectiveDifficulty] ?? 75;

        // Clear stats for the incoming question date so users can answer again
        await TriviaStats.deleteMany({
          guildId: cfg.guildId,
          questionId: today,
        }).catch((err) =>
          // without this, people who answered on this date before can't answer again
          logger.warn(
            `trivia-scheduler: couldn't clear old answers for guild ${cfg.guildId}: ${err}`,
          ),
        );

        // Disable button on old message
        if (cfg.lastMessageId) {
          const oldMessage = await channel.messages
            .fetch(cfg.lastMessageId)
            .catch(() => null);
          if (oldMessage) {
            const disabledButton = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("trivia_expired")
                .setLabel("Submissions Closed")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            );
            await oldMessage
              .edit({ components: [disabledButton] })
              // the old question was deleted or I lost access to it; nothing to fix
              .catch(() => {});
          }
        }

        const difficultyEmoji = { easy: "🟢", medium: "🟡", hard: "🔴" };

        const embed = new EmbedBuilder()
          .setColor("Blurple")
          .setTitle("📚 Daily Trivia Question")
          .setDescription(`**${question.question}**`)
          .addFields(
            {
              name: "Category",
              value: question.category,
              inline: true,
            },
            {
              name: "Difficulty",
              value: `${difficultyEmoji[effectiveDifficulty] ?? ""} ${effectiveDifficulty}`,
              inline: true,
            },
            {
              name: "Base Payout",
              value: `${basePayout} rice grains`,
              inline: true,
            },
            ...(requiresChoices
              ? [
                  {
                    name: "Choices",
                    value: allAnswers
                      .map((a, i) => `${["🅐", "🅑", "🅒", "🅓"][i]} ${a}`)
                      .join("\n"),
                  },
                ]
              : []),
          )
          .setFooter({
            text: "Click Submit Answer to enter your answer. All correct submissions win!",
          })
          .setTimestamp();

        const button = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`trivia_answer_${cfg.guildId}_${today}`)
            .setLabel("Submit Answer")
            .setStyle(ButtonStyle.Primary),
        );

        const sentMessage = await channel.send({
          embeds: [embed],
          components: [button],
        });

        cfg.lastSentDate = today;
        cfg.correctAnswer = correctAnswer;
        cfg.questionDifficulty = effectiveDifficulty;
        cfg.lastMessageId = sentMessage.id;
        await cfg.save();
      } catch (err) {
        logger.error(
          `trivia-scheduler: error processing guild ${cfg.guildId}:`,
          err,
        );
      }
    }
  });
};
