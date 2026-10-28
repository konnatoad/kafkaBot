const { sabiServer } = require("../../config.json");
const { MessageFlags } = require("discord.js");

module.exports = (interaction, commandObject) => {
  if (!commandObject.sabiServer) return;

  const allowedServers = Array.isArray(sabiServer) ? sabiServer : [sabiServer];

  if (!allowedServers.includes(interaction.guild?.id)) {
    interaction.reply({
      content: "This command cannot be ran here.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  return false;
};
