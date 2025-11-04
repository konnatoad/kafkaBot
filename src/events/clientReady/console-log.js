const { MessageFlags } = require("discord.js");

module.exports = (client) => {
  console.log(`${client.user.tag} is now online!`);

  client.guilds.cache.forEach((guild) => {
    console.log(`Bot is in guild: ${guild.name} (ID: ${guild.id})`);
  });

  // Call the scheduleDailyQuote function to start the daily quote scheduler
  const {
    scheduleDailyQuote,
  } = require("../../commands/admin/configuration/misc/dailyQuote");
  scheduleDailyQuote(client);

  console.log("Daily quote scheduler started.");
};
