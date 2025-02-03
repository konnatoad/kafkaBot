const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("feedback")
    .setDescription("Send feedback to the bot developer!"),

  run: async ({ interaction }) => {
    if (!interaction.guild)
      return await interaction.reply({
        content: "Please submit your feedback within a server!",
        flags: MessageFlags.Ephemeral,
      });

    const modal = new ModalBuilder()
      .setTitle("Feedback Submission")
      .setCustomId("feedbackSubmit");

    const feature = new TextInputBuilder()
      .setCustomId("feature")
      .setRequired(true)
      .setPlaceholder(
        "What feature or aspect of the bot are you giving feedback on?"
      )
      .setLabel("Feature or Topic")
      .setStyle(TextInputStyle.Short);

    const feedbackDescription = new TextInputBuilder()
      .setCustomId("feedbackDescription")
      .setRequired(true)
      .setPlaceholder("Provide detailed feedback or suggestions")
      .setLabel("Your Feedback")
      .setStyle(TextInputStyle.Paragraph);

    const row1 = new ActionRowBuilder().addComponents(feature);
    const row2 = new ActionRowBuilder().addComponents(feedbackDescription);

    modal.addComponents(row1, row2);
    await interaction.showModal(modal);
  },
};
