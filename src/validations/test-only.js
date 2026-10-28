const { MessageFlags } = require("discord.js");
const { testServer } = require("../../config.json");

module.exports = async (interaction, commandObject) => {
  if (!commandObject.testOnly) return;

  if (interaction.guildId !== testServer) {
    await interaction.reply({
      content: "This command cannot be run here.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
};
