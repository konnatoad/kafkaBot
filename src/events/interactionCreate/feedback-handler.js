require("dotenv").config();
const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = async (interaction, client) => {
  if (!interaction.guild || !interaction.isModalSubmit()) return;

  if (interaction.customId === "feedbackSubmit") {
    const feature = interaction.fields.getTextInputValue("feature");
    const feedbackDescription = interaction.fields.getTextInputValue(
      "feedbackDescription"
    );

    const member = interaction.member;
    const userId = interaction.user.id;
    const server = interaction.guild;

    const feedbackChannel = await client.channels.cache.get(
      process.env.FEEDBACK
    );

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
        { name: "Feedback", value: `> ${feedbackDescription}` }
      )
      .setFooter({
        text: "Feedback System",
        iconURL: "https://vou.s-ul.eu/ts9RQjxl",
      })
      .setTimestamp();

    await feedbackChannel.send({ embeds: [feedbackEmbed] }).catch(() => {}); // Handle any errors silently

    await interaction.reply({
      content:
        "Thank you for your feedback! The developer will review it soon.",
      flags: MessageFlags.Ephemeral,
    });
  }
};
