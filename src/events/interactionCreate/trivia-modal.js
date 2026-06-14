const { InteractionType, MessageFlags } = require("discord.js");
const Fuse = require("fuse.js");
const TriviaConfig = require("../../schemas/TriviaConfig");
const TriviaStats = require("../../schemas/TriviaStats");
const UserProfile = require("../../schemas/UserProfile");
const logger = require("../../extra/logger");
const { currentPrize } = require("../../utils/trivia");

function isCorrect(userAnswer, correctAnswer) {
  const trimmed = userAnswer.trim();
  if (trimmed.length < Math.max(3, correctAnswer.length * 0.6)) return false;
  const fuse = new Fuse([correctAnswer], { threshold: 0.2, includeScore: true });
  const results = fuse.search(trimmed);
  return results.length > 0 && results[0].score <= 0.2;
}

module.exports = async (interaction, client) => {
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
      return interaction.editReply({ content: "This question is no longer active." });
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
      { upsert: true }
    );

    const correctEphemeral = attempts === 1
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
        return interaction.editReply({ content: "Something went wrong. Try again." });
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
