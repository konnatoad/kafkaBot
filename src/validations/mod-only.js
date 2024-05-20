const { mods } = require("../../config.json");

module.exports = (interaction, commandObject) => {
  if (commandObject.modOnly) {
    if (!mods.includes(interaction.member.id)) {
      interaction.reply({
        content: "Only mods are allowed to run this command.",
        ephemeral: true,
      });
      return true;
    }
  }
};
