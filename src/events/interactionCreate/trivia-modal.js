const { InteractionType, MessageFlags } = require("discord.js");
const TriviaConfig = require("../../schemas/TriviaConfig");
const TriviaStats = require("../../schemas/TriviaStats");
const UserProfile = require("../../schemas/UserProfile");
const logger = require("../../extra/logger");
const { currentPrize } = require("../../utils/trivia");

const NUMERIC = /^-?\d[\d,\s]*(\.\d+)?$/;

function normalize(str) {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

function toWords(str) {
  const words = str
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  if (words.length > 1 && ["the", "a", "an"].includes(words[0])) words.shift();
  return words;
}
function allowedTypos(word) {
  if (word.length <= 4) return 0;
  if (word.length <= 9) return 1;
  return 2;
}
function typoDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

function isCorrect(userAnswer, correctAnswer) {
  const user = normalize(userAnswer);
  const answer = normalize(correctAnswer);
  if (user === answer) return true;

  // compare numbers by value, fuzzy matching would accept 100 for 1000
  if (NUMERIC.test(answer)) {
    const toNumber = (s) => Number(s.replace(/[,\s]/g, ""));
    return NUMERIC.test(user) && toNumber(user) === toNumber(answer);
  }

  // short answers like "Au" have to match exactly
  if (answer.length <= 3) return false;
  const userWords = toWords(user);
  const answerWords = toWords(answer);
  if (userWords.length !== answerWords.length) return false;
  return answerWords.every((word, i) => typoDistance(userWords[i], word) <= allowedTypos(word));
}

module.exports = async (interaction) => {
  if (interaction?.type !== InteractionType.ModalSubmit) return;
  if (!interaction.customId?.startsWith("trivia_modal_")) return;

  const parts = interaction.customId.split("_");
  // customId format: trivia_modal_{guildId}_{date}
  const guildId = parts[2];
  const questionId = parts[3];

  if (interaction.guildId !== guildId) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const cfg = await TriviaConfig.findOne({ guildId });
    if (!cfg || cfg.lastSentDate !== questionId || !cfg.correctAnswer) {
      return interaction.editReply({
        content: "This question is no longer active.",
      });
    }

    const difficulty = cfg.questionDifficulty ?? "medium";
    const userAnswer = interaction.fields.getTextInputValue("trivia_answer_text") ?? "";

    let stats = await TriviaStats.findOne({
      guildId,
      questionId,
      userId: interaction.user.id,
    });

    if (stats?.solved) {
      return interaction.editReply({
        content: "you already got this one. don't get greedy.",
      });
    }

    const correct = isCorrect(userAnswer, cfg.correctAnswer);

    if (!correct) {
      if (!stats) {
        stats = await TriviaStats.create({
          guildId,
          questionId,
          userId: interaction.user.id,
          wrongAttempts: 1,
          solved: false,
        });
      } else {
        stats.wrongAttempts += 1;
        await stats.save();
      }

      const nextPrize = currentPrize(difficulty, stats.wrongAttempts);
      const wrongMessages = [
        `❌ No. **${nextPrize} rice grains** left.`,
        `❌ Wrong. Did you even read the question? **${nextPrize} rice grains** left.`,
        `❌ Genuinely embarrassing. **${nextPrize} rice grains** left.`,
        `❌ That's not it. Are you even trying? **${nextPrize} rice grains** left.`,
        `❌ Yikes. **${nextPrize} rice grains** left.`,
        `❌ Wrong. **${nextPrize} rice grains** left. Maybe just stop.`,
        `❌ You do realize everyone can see how bad you are at this, right? **${nextPrize} rice grains** left.`,
        `❌ I'm not even surprised. **${nextPrize} rice grains** left.`,
        `❌ Have you considered not answering? **${nextPrize} rice grains** left.`,
      ];
      return interaction.editReply({
        content: wrongMessages[Math.floor(Math.random() * wrongMessages.length)],
      });
    }

    // Correct answer
    const wrongAttempts = stats?.wrongAttempts ?? 0;
    const prize = currentPrize(difficulty, wrongAttempts);
    const attempts = wrongAttempts + 1;

    if (stats) {
      stats.solved = true;
      await stats.save();
    } else {
      await TriviaStats.create({
        guildId,
        questionId,
        userId: interaction.user.id,
        wrongAttempts: 0,
        solved: true,
      });
    }

    await UserProfile.findOneAndUpdate(
      { userId: interaction.user.id, Guild: guildId },
      { $inc: { balance: prize } },
      { upsert: true },
    );

    const correctEphemeral =
      attempts === 1
        ? `✅ Fine. You got it. **+${prize} rice grains**. Don't make it a habit.`
        : `✅ Took you long enough. **+${prize} rice grains**. ${attempts} attempts. Pathetic.`;

    await interaction.editReply({ content: correctEphemeral });

    const channel = interaction.channel;
    if (channel) {
      const announcement =
        attempts === 1
          ? `${interaction.user} answered correctly first try. **${prize} rice grains**. whatever.`
          : `${interaction.user} got it after **${attempts} attempts** and won **${prize} rice grains**. took long enough.`;

      await channel.send(announcement).catch((err) => {
        logger.error("trivia-modal: failed to send public announcement:", err);
      });
    }
  } catch (err) {
    logger.error("trivia-modal error:", err);
    try {
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: "Something went wrong. Try again.",
        });
      }
      return interaction.reply({
        content: "Something went wrong. Try again.",
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyErr) {
      logger.error("trivia-modal: failed to send error reply:", replyErr);
    }
  }
};
