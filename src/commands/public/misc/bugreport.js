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
    .setName("bug-report")
    .setDescription("Sends a bug report to the bot dev!"),

  run: async ({ interaction }) => {
    if (!interaction.guild)
      return await interaction.reply({
        content: "Please report this bug within a server!",
        flags: MessageFlags.Ephemeral,
      });

    const modal = new ModalBuilder()
      .setTitle("Bug & Command abuse reporting")
      .setCustomId("bugreport");

    const feature = new TextInputBuilder()
      .setCustomId("type")
      .setRequired(true)
      .setPlaceholder("e.g. /leaderboard, Twitch notifications")
      .setLabel("What feature has a bug?")
      .setStyle(TextInputStyle.Short);

    const description = new TextInputBuilder()
      .setCustomId("description")
      .setRequired(true)
      .setPlaceholder("Describe what is happening")
      .setLabel("Describe the bug")
      .setStyle(TextInputStyle.Paragraph);

    const steps = new TextInputBuilder()
      .setCustomId("steps")
      .setRequired(true)
      .setPlaceholder("1. Run /command\n2. See error")
      .setLabel("Steps to reproduce")
      .setStyle(TextInputStyle.Paragraph);

    const expected = new TextInputBuilder()
      .setCustomId("expected")
      .setRequired(true)
      .setPlaceholder("What should happen vs what actually happens")
      .setLabel("Expected vs actual behavior")
      .setStyle(TextInputStyle.Paragraph);

    const severity = new TextInputBuilder()
      .setCustomId("severity")
      .setRequired(true)
      .setPlaceholder("low / medium / high")
      .setLabel("Severity (low / medium / high)")
      .setStyle(TextInputStyle.Short);

    modal.addComponents(
      new ActionRowBuilder().addComponents(feature),
      new ActionRowBuilder().addComponents(description),
      new ActionRowBuilder().addComponents(steps),
      new ActionRowBuilder().addComponents(expected),
      new ActionRowBuilder().addComponents(severity)
    );
    await interaction.showModal(modal);
  },
};
