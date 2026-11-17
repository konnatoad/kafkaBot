const { EmbedBuilder, MessageFlags } = require("discord.js");
const ConfessionConfig = require("../../schemas/ConfessionConfig.js");
const logger = require("../../extra/logger");
const {
  blockedWordsFor,
  findBlockedWord,
} = require("../../utils/blockedWords");

module.exports = async (interaction, client) => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== "confession_modal_v1") return;
  if (!interaction.guildId) return;

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const text = (
      interaction.fields.getTextInputValue("confession_text") || ""
    ).trim();

    if (!text) {
      return interaction.editReply({
        content: "empty",
      });
    }
    if (text.length > 4000) {
      return interaction.editReply({
        content: "too long",
      });
    }
    const blocked = findBlockedWord(
      text,
      await blockedWordsFor(interaction.guildId),
    );
    if (blocked) {
      // which server and which word, never who sent it
      logger.info(
        `confession rejected in guild "${interaction.guild?.name}" ${interaction.guildId}: matched "${blocked}"`,
      );
      return interaction.editReply({
        content: "that can't be posted",
      });
    }

    const cfg = await ConfessionConfig.findOne({
      guildId: interaction.guildId,
    });
    if (!cfg) {
      return interaction.editReply({
        content: "not set up",
      });
    }

    const channel = await client.channels
      .fetch(cfg.channelId)
      .catch(() => null);
    if (!channel) {
      return interaction.editReply({
        content: "Confessions channel missing",
      });
    }

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle("Anonymous Confession")
      .setDescription(text)
      .setTimestamp();

    await channel.send({
      embeds: [embed],
    });

    return interaction.editReply({
      content: "sent",
    });
  } catch (err) {
    logger.error("confession-modal error:", err);

    try {
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: "Something broke while sending",
        });
      }
      return interaction.reply({
        content: "Something broke while sending",
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyErr) {
      logger.error("confession-modal: failed to send error reply:", replyErr);
    }
  }
};
