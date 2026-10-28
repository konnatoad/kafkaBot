const logger = require("../../extra/logger");
const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = async (interaction, client) => {
  if (!interaction.guild || !interaction.isModalSubmit()) return;

  if (interaction.customId === "feedbackSubmit") {
    const feature = interaction.fields.getTextInputValue("feature");
    const feedbackDescription = interaction.fields.getTextInputValue(
      "feedbackDescription",
    );

    const member = interaction.member;
    const userId = interaction.user.id;
    const server = interaction.guild;

    const feedbackChannel = client.channels.cache.get(process.env.FEEDBACK);
    if (!feedbackChannel) {
      return interaction.reply({
        content: "Feedback channel is not configured.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const feedbackEmbed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("New Feedback Received!")
      .addFields(
        {
          name: "Submitting Member",
          value: `\`${member.user.username} (${userId})\``,
        },
        {
          name: "Submitting Guild",
          value: `\`${server.name} (${server.id})\``,
        },
        { name: "Feature/Topic", value: `> ${feature}` },
        { name: "Feedback", value: `> ${feedbackDescription}` },
      )
      .setFooter({
        text: "Feedback System",
        iconURL: "https://vou.s-ul.eu/ts9RQjxl",
      })
      .setTimestamp();

    const delivered = await feedbackChannel
      .send({ embeds: [feedbackEmbed] })
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
        ? "Thank you for your feedback! The developer will review it soon."
        : "Sorry, your feedback couldn't be delivered. Please try again in a bit.",
      flags: MessageFlags.Ephemeral,
    });
  }
};
