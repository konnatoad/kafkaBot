const logger = require("../../extra/logger");
const {
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { quote } = require("../../utils/ideas");

// posts a /feedback idea to the feedback channel with buttons to approve or decline it
// (the buttons are handled in idea-decision.js)
module.exports = async (interaction, client) => {
  if (!interaction.guild || !interaction.isModalSubmit()) return;
  if (interaction.customId !== "feedbackSubmit") return;

  const title = interaction.fields.getTextInputValue("ideaTitle").trim();
  const how = interaction.fields.getTextInputValue("ideaHow").trim();
  const why = interaction.fields.getTextInputValue("ideaWhy").trim();
  const { user, guild } = interaction;

  const feedbackChannel = client.channels.cache.get(process.env.FEEDBACK);
  if (!feedbackChannel) {
    return interaction.reply({
      content: "Ideas can't be sent right now.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const embed = new EmbedBuilder()
    .setColor("Yellow")
    .setTitle("💡 New idea")
    .addFields(
      { name: "Idea", value: quote(title) },
      { name: "How it works", value: quote(how) },
      ...(why ? [{ name: "Why", value: quote(why) }] : []),
      { name: "From", value: `\`${user.username} (${user.id})\`` },
      { name: "Server", value: `\`${guild.name} (${guild.id})\`` },
    )
    .setTimestamp();

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ideaApprove - ${user.id}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`ideaDecline - ${user.id}`)
      .setLabel("Decline")
      .setStyle(ButtonStyle.Danger),
  );

  const delivered = await feedbackChannel
    .send({ embeds: [embed], components: [buttons] })
    .then(() => true)
    .catch((err) => {
      logger.error(
        "feedback-handler: failed to send to feedback channel:",
        err,
      );
      return false;
    });

  await interaction.reply({
    content: delivered
      ? "Thanks for the idea! The developer will look at it."
      : "Sorry, your idea couldn't be delivered. Please try again in a bit.",
    flags: MessageFlags.Ephemeral,
  });
};
