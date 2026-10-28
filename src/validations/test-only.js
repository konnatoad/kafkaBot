const { testServer } = require("../../config.json");
const { MessageFlags } = require("discord.js");

module.exports = (interaction, commandObject) => {
  if (commandObject.testOnly) {
    if (!(interaction.guild.id === testServer)) {
      interaction.reply({
        content: "This command cannot be ran here.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
  }
};
