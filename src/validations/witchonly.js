const { sabiServer } = require("../../config.json");

module.exports = (interaction, commandObject) => {
  if (commandObject.sabiServer) {
    if (!(interaction.guild.id === sabiServer)) {
      interaction.reply({
        content: "This command cannot be ran here.",
        ephemeral: true,
      });
      return true;
    }
  }
};