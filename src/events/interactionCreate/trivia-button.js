const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
  InteractionType,
} = require("discord.js");
const TriviaConfig = require("../../schemas/TriviaConfig");
const TriviaStats = require("../../schemas/TriviaStats");
const logger = require("../../extra/logger");

const BASE_PAYOUT = { easy: 25, medium: 75, hard: 150 };
const MIN_PAYOUT = { easy: 1, medium: 5, hard: 10 };

function currentPrize(difficulty, wrongAttempts) {
  const base = BASE_PAYOUT[difficulty] ?? 75;
  const min = MIN_PAYOUT[difficulty] ?? 1;
  return Math.max(base - wrongAttempts, min);
}

module.exports = async (interaction, client) => {
  if (interaction?.type !== InteractionType.MessageComponent) return;
  if (interaction.customId === "trivia_dev_simulated") {
    return interaction.reply({
      content: "this is a simulation. no real answers accepted.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!interaction.customId?.startsWith("trivia_answer_")) return;

  const parts = interaction.customId.split("_");
  // customId format: trivia_answer_{guildId}_{date}
  const guildId = parts[2];
  const questionId = parts[3];

  if (interaction.guildId !== guildId) return;

  const cfg = await TriviaConfig.findOne({ guildId }).catch(() => null);
  if (!cfg || cfg.lastSentDate !== questionId) {
    return interaction.reply({
      content: "that question is long gone. keep up.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const stats = await TriviaStats.findOne({
    guildId,
    questionId,
    userId: interaction.user.id,
  }).catch(() => null);

  if (stats?.solved) {
    return interaction.reply({
      content: "you already got this one. don't get greedy.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const wrongAttempts = stats?.wrongAttempts ?? 0;
  const difficulty = cfg.questionDifficulty ?? "medium";
  const prize = currentPrize(difficulty, wrongAttempts);

  const modal = new ModalBuilder()
    .setCustomId(`trivia_modal_${guildId}_${questionId}`)
    .setTitle("Submit Your Answer");

  const answerInput = new TextInputBuilder()
    .setCustomId("trivia_answer_text")
    .setLabel(`Your prize pool: ${prize} rice grains`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Type your answer here...")
    .setRequired(true)
    .setMaxLength(200);

  modal.addComponents(new ActionRowBuilder().addComponents(answerInput));

  await interaction.showModal(modal).catch((err) => {
    logger.error("trivia-button: failed to show modal:", err);
  });
};
