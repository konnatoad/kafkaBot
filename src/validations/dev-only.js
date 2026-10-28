const { MessageFlags } = require("discord.js");
const { devs } = require("../../config.json");

module.exports = async (interaction, commandObject) => {
  if (!commandObject.devOnly) return;

  // interaction.user, not .member: member is null when the command runs in a DM
  if (!devs.includes(interaction.user.id)) {
    await interaction.reply({
      content: "Only developers are allowed to run this command.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
};
