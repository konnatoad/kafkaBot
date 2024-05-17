module.exports = (client, interaction, commandObject) => {
  if (commandObject.botPermissions?.length) {
    for (const permission of commandObject.botPermissions) {
      const bot = interaction.guild.members.me;

      if (!bot.permissions.has(permission)) {
        interaction.reply({
          content: "I don't have enough permissions.",
          ephemeral: true,
        });
        return;
      }
    }
  }
};
