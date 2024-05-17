const { testServer } = require("../../config.json");

module.exports = (interaction, commandObject) => {
  if (commandObject.testOnly) {
    if (!(interaction.guild.id === testServer)) {
      interaction.reply({
        content: "This command cannot be ran here.",
        ephemeral: true,
      });
      return true;
    }
  }
};
