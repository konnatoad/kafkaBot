const Ban = require("../../schemas/banschema");
const logger = require("../../extra/logger");

const CHECK_EVERY_MS = 60 * 1000;
// 10026: Unknown Ban, someone already unbanned them by hand
const UNKNOWN_BAN = 10026;

async function liftExpiredBans(client) {
  try {
    const expired = await Ban.find({ expirationTime: { $lte: new Date() } });
    for (const ban of expired) {
      // a guild the bot has left can't be unbanned from; the record goes either way
      await client.guilds.cache
        .get(ban.guildId)
        ?.members.unban(ban.userId, "temporary ban ran out")
        .catch((error) => {
          if (error.code !== UNKNOWN_BAN) {
            logger.error(
              `tempban: failed to unban ${ban.userId} in ${ban.guildId}: ${error}`,
            );
          }
        });
      await Ban.deleteOne({ _id: ban._id });
    }
  } catch (error) {
    logger.error(`tempban: failed to lift expired bans: ${error}`);
  }
}

module.exports = (client) => {
  setInterval(() => liftExpiredBans(client), CHECK_EVERY_MS);
};
