const { MessageFlags } = require("discord.js");
const { sabiServer } = require("../../config.json");

const allowedServers = Array.isArray(sabiServer) ? sabiServer : [sabiServer];

module.exports = (interaction, commandObject) => {
  if (!commandObject.sabiServer) return;

  if (!allowedServers.includes(interaction.guildId)) {
    interaction.reply({
      content: "This command cannot be run here.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
};
