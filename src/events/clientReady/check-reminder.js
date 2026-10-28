const cron = require("node-cron");
const UserProfile = require("../../schemas/UserProfile");
const logger = require("../../extra/logger");

// "08:05". Times used to be saved exactly as typed, so "8:05" is in the database
// too and gets matched as well.
function currentTimes() {
  const now = new Date();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return [
    `${String(now.getHours()).padStart(2, "0")}:${minutes}`,
    `${now.getHours()}:${minutes}`,
  ];
}

async function remind(client, { userId, Guild }) {
  const guild =
    client.guilds.cache.get(Guild) ||
    (await client.guilds.fetch(Guild).catch(() => null));
  if (!guild) {
    logger.warn(
      `reminder: bot is no longer in guild ${Guild}, skipped ${userId}`,
    );
    return;
  }
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) {
    logger.warn(`reminder: ${userId} has left guild ${Guild}, skipped`);
    return;
  }
  try {
    await member.send(
      `Hey <@${userId}>, it's time for your daily reminder to collect your dailies!`,
    );
    logger.info(`Reminder sent to ${member.user.tag} in ${guild.name}`);
  } catch (err) {
    // 50007: their DMs are closed, nothing to fix on our side
    if (err.code !== 50007)
      logger.error(`reminder: failed to DM ${userId}:`, err);
  }
}

module.exports = (client) => {
  // cron fires at second 0 of each minute; a 60s setInterval slowly drifts and
  // could step over a minute entirely, skipping everyone set for it
  cron.schedule("* * * * *", async () => {
    let due;
    try {
      due = await UserProfile.find({ reminderTime: { $in: currentTimes() } });
    } catch (error) {
      logger.error("reminder: failed to load reminders:", error);
      return;
    }
    for (const profile of due) {
      await remind(client, profile).catch((error) =>
        logger.error(`reminder: failed for ${profile.userId}:`, error),
      );
    }
  });
};
