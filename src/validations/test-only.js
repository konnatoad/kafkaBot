const { MessageFlags } = require("discord.js");
const { testServer } = require("../../config.json");

module.exports = (interaction, commandObject) => {
  if (!commandObject.testOnly) return;

  if (interaction.guildId !== testServer) {
    interaction.reply({
      content: "This command cannot be run here.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
};
