const logger = require("../../extra/logger");
const { MessageFlags } = require("discord.js");

module.exports = async (interaction, client) => {
  if (interaction.customId) {
    if (interaction.customId.includes("bugSolved - ")) {
      var stringId = interaction.customId;
      stringId = stringId.replace("bugSolved - ", "");

      var member = await client.users.fetch(stringId);
      await member
        .send({
          content:
            "This message was initialized by the developer indicating that the bug you reported has been solved.",
        })
        .catch((err) => {
          if (err.code !== 50007) logger.error("bugreportbutton: failed to DM member:", err);
        });
      await interaction.reply({
        content: `I have notified the member that their report is now solved`,
        flags: MessageFlags.Ephemeral,
      });
      await interaction.message.delete().catch((err) => {
        if (err.code !== 10008) logger.error("bugreportbutton: failed to delete message:", err);
      });
    }
  }
};
