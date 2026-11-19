const Ban = require("../../schemas/banschema");
const logger = require("../../extra/logger");

const CHECK_EVERY_MS = 60 * 1000;
// 10026: Unknown Ban, someone already unbanned them by hand
const UNKNOWN_BAN = 10026;

// bans whose unban failed, so a ban that keeps failing is logged once, not every minute
const failing = new Set();

// true once the ban is gone: lifted now, already lifted by hand, or in a guild the bot left
async function lift(client, ban) {
  const guild = client.guilds.cache.get(ban.guildId);
  if (!guild) return true;
  try {
    await guild.members.unban(ban.userId, "temporary ban ran out");
    return true;
  } catch (error) {
    if (error.code === UNKNOWN_BAN) return true;
    // anything else (an outage, a lost Ban Members permission) tries again next minute
    if (!failing.has(String(ban._id))) {
      failing.add(String(ban._id));
      logger.error(
        `tempban: failed to unban ${ban.userId} in ${ban.guildId}, trying again every minute: ${error}`,
      );
    }
    return false;
  }
}

async function liftExpiredBans(client) {
  try {
    const expired = await Ban.find({ expirationTime: { $lte: new Date() } });
    for (const ban of expired) {
      if (!(await lift(client, ban))) continue;
      if (failing.delete(String(ban._id)))
        logger.info(`tempban: unbanned ${ban.userId} in ${ban.guildId} after earlier failures`);
      await Ban.deleteOne({ _id: ban._id });
    }
  } catch (error) {
    logger.error(`tempban: failed to lift expired bans: ${error}`);
  }
}

module.exports = (client) => {
  setInterval(() => liftExpiredBans(client), CHECK_EVERY_MS);
};
