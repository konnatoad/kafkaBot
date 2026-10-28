const { MessageFlags } = require("discord.js");
const { devs } = require("../../config.json");

module.exports = (interaction, commandObject) => {
  if (commandObject.devOnly) {
    if (!devs.includes(interaction.member.id)) {
      interaction.reply({
        content: "Only developers are allowed to run this command.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
  }
};
