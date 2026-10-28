const { MessageFlags } = require("discord.js");

module.exports = (client, interaction, commandObject) => {
  if (commandObject.permissionsRequired?.length) {
    for (const permission of commandObject.permissionsRequired) {
      if (!interaction.member.permissions.has(permission)) {
        interaction.reply({
          content: "Not enough permissions.",
          flags: MessageFlags.Ephemeral,
        });
        return true;
      }
    }
  }
};
