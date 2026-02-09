const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
  testOnly: true,
  data: new SlashCommandBuilder()
    .setName("confess")
    .setDescription("send an anonymous confession."),
  run: async ({ interaction }) => {
    const modal = new ModalBuilder()
      .setCustomId("confession_modal_v1")
      .setTitle("Anonymous Confession");

    const input = new TextInputBuilder()
      .setCustomId("confession_text")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(4000)
      .setPlaceholder("Write here (up to 4000 chars).");

    // satisfy discord API by forcing label in the payload
    input.data.label = "Confession";

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    return interaction.showModal(modal);
  },
};
