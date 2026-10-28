const { MessageFlags } = require("discord.js");
const { witchServers } = require("../../config.json");

module.exports = (interaction, commandObject) => {
  if (!commandObject.witchOnly) return;

  if (!witchServers.includes(interaction.guildId)) {
    interaction.reply({
      content: "This command cannot be run here.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
};
