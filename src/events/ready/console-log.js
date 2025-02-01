module.exports = (client) => {
  console.log(`${client.user.tag} is now online!`);

  // Optional: Debugging log to check if guilds are available
  client.guilds.cache.forEach((guild) => {
    console.log(`Bot is in guild: ${guild.name} (ID: ${guild.id})`);
  });
};
