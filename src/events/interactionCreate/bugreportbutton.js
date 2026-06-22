const logger = require("../../extra/logger");
const { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

module.exports = async (interaction, client) => {
  if (!interaction.customId) return;

  if (interaction.customId.startsWith("bugSolved - ")) {
    const userId = interaction.customId.replace("bugSolved - ", "");

    const modal = new ModalBuilder()
      .setCustomId(`bugSolvedModal - ${userId}`)
      .setTitle("Resolve Bug Report");

    const comment = new TextInputBuilder()
      .setCustomId("resolveComment")
      .setLabel("Resolution comment (sent to reporter)")
      .setPlaceholder("Describe what was fixed or any notes for the reporter...")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(comment));
    await interaction.showModal(modal);
  }

  if (interaction.customId.startsWith("bugSolvedModal - ")) {
    const userId = interaction.customId.replace("bugSolvedModal - ", "");
    const comment = interaction.fields.getTextInputValue("resolveComment");

    const member = await client.users.fetch(userId).catch(() => null);
    if (member) {
      await member
        .send({
          content: `Your bug report has been resolved by the developer!\n\n**Developer's note:**\n> ${comment.split("\n").join("\n> ")}`,
        })
        .catch((err) => {
          if (err.code !== 50007) logger.error("bugreportbutton: failed to DM member:", err);
        });
    }

    await interaction.reply({
      content: `I have notified the member that their report is now solved.`,
      flags: MessageFlags.Ephemeral,
    });

    await interaction.message.delete().catch((err) => {
      if (err.code !== 10008) logger.error("bugreportbutton: failed to delete message:", err);
    });
  }
};
