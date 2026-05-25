const logger = require("../../extra/logger");
const { MessageFlags } = require("discord.js");

module.exports = (client) => {
  logger.info(`${client.user.tag} is now online!`);

  client.guilds.cache.forEach((guild) => {
    logger.info(`Bot is in guild: ${guild.name} (ID: ${guild.id})`);
  });

  // Call the scheduleDailyQuote function to start the daily quote scheduler
  const {
    scheduleDailyQuote,
  } = require("../../commands/admin/configuration/misc/dailyQuote");
  scheduleDailyQuote(client);

  logger.info("Daily quote scheduler started.");
};
