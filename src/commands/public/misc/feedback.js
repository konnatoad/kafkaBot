const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("feedback")
  .setDescription("Send a bug report or an idea to the bot developer")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("bug")
      .setDescription("Sends a bug report to the bot dev!"),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("idea")
      .setDescription("Send feedback to the bot developer!"),
  );

// both forms are read in a server channel, so they only open inside a server
const notInGuild = (interaction, content) =>
  interaction.reply({ content, flags: MessageFlags.Ephemeral });

const row = (input) => new ActionRowBuilder().addComponents(input);

// each answer ends up in an embed field, which holds at most 1024 characters.
// The modal custom IDs ("bugreport", "feedbackSubmit") are what
// events/interactionCreate/bugreport.js and feedback-handler.js listen for.
const bug = async ({ interaction }) => {
  if (!interaction.guild)
    return notInGuild(interaction, "Please report this bug within a server!");

  const modal = new ModalBuilder()
    .setTitle("Bug & Command abuse reporting")
    .setCustomId("bugreport");

  const feature = new TextInputBuilder()
    .setCustomId("type")
    .setRequired(true)
    .setPlaceholder("e.g. /leaderboard, Twitch notifications")
    .setLabel("What feature has a bug?")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100);

  const description = new TextInputBuilder()
    .setCustomId("description")
    .setRequired(true)
    .setPlaceholder("Describe what is happening")
    .setLabel("Describe the bug")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000);

  const steps = new TextInputBuilder()
    .setCustomId("steps")
    .setRequired(true)
    .setPlaceholder("1. Run /command\n2. See error")
    .setLabel("Steps to reproduce")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000);

  const expected = new TextInputBuilder()
    .setCustomId("expected")
    .setRequired(true)
    .setPlaceholder("What should happen vs what actually happens")
    .setLabel("Expected vs actual behavior")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000);

  const severity = new TextInputBuilder()
    .setCustomId("severity")
    .setRequired(true)
    .setPlaceholder("low / medium / high")
    .setLabel("Severity (low / medium / high)")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100);

  modal.addComponents(
    row(feature),
    row(description),
    row(steps),
    row(expected),
    row(severity),
  );
  await interaction.showModal(modal);
};

const idea = async ({ interaction }) => {
  if (!interaction.guild)
    return notInGuild(
      interaction,
      "Please submit your feedback within a server!",
    );

  const modal = new ModalBuilder()
    .setTitle("Feedback Submission")
    .setCustomId("feedbackSubmit");

  const feature = new TextInputBuilder()
    .setCustomId("feature")
    .setRequired(true)
    .setPlaceholder(
      "What feature or aspect of the bot are you giving feedback on?",
    )
    .setLabel("Feature or Topic")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100);

  const feedbackDescription = new TextInputBuilder()
    .setCustomId("feedbackDescription")
    .setRequired(true)
    .setPlaceholder("Provide detailed feedback or suggestions")
    .setLabel("Your Feedback")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000);

  modal.addComponents(row(feature), row(feedbackDescription));
  await interaction.showModal(modal);
};

module.exports = { data, subcommands: { bug, idea } };
