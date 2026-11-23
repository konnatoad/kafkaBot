const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const ConfessionConfig = require("../../../schemas/ConfessionConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("confess")
    .setDescription("send an anonymous confession"),
  run: async ({ interaction }) => {
    // when the server logs confessions, the form says so before anyone writes one
    const cfg = interaction.guildId
      ? await ConfessionConfig.findOne({ guildId: interaction.guildId })
          .lean()
          .catch(() => null)
      : null;

    const modal = new ModalBuilder()
      .setCustomId(
        cfg?.logChannelId
          ? "confession_modal_v1:logged"
          : "confession_modal_v1:anon",
      )
      .setTitle("Anonymous Confession");

    const input = new TextInputBuilder()
      .setCustomId("confession_text")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(4000)
      .setPlaceholder("Write here (up to 4000 chars).");

    // satisfy discord API by forcing label in the payload
    input.data.label = cfg?.logChannelId
      ? "Confession (mods can see who sent it)"
      : "Confession";

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    return interaction.showModal(modal);
  },
};
