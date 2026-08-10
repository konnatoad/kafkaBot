const logger = require("../../extra/logger");

module.exports = async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const location = interaction.guild
    ? `${interaction.guild.name} (${interaction.guildId})`
    : "DM";

  logger.info(`/${interaction.commandName} ran in ${location}`);
};
