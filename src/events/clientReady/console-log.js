const logger = require("../../extra/logger");

module.exports = (client) => {
  logger.info(`${client.user.tag} is now online!`);

  client.guilds.cache.forEach((guild) => {
    logger.info(`Bot is in guild: ${guild.name} (ID: ${guild.id})`);
  });
};
