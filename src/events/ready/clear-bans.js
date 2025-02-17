const Ban = require("../../schemas/banschema");

module.exports = (client) => {
  setInterval(async () => {
    try {
      const bans = await Ban.find().select("userId expirationTime guildId");

      for (const ban of bans) {
        if (Date.now() < new Date(ban.expirationTime).getTime()) {
          continue;
        }

        const guild = client.guilds.cache.get(ban.guildId);
        if (guild) {
          try {
            await guild.members.unban(ban.userId);
          } catch (error) {
            console.log(`Error unbanning user ${ban.userId}: ${error}`);
          }
        }

        await Ban.deleteOne({ _id: ban._id });
      }
    } catch (error) {
      console.log(`Error clearing bans: ${error}`);
    }
  }, 60000); // Check every minute for expired bans
};
