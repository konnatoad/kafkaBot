module.exports = (client) => {
  console.log(`${client.user.tag} is now online!`);

  client.guilds.cache.forEach((guild) => {
    console.log(`Bot is in guild: ${guild.name} (ID: ${guild.id})`);
  });
};
