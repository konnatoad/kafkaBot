const NotificationConfig = require("../../schemas/twitchNotificationSchema");
const logger = require("../../extra/logger");
const { liveUserIds } = require("../../utils/twitch");

const CHECK_EVERY_MS = 5 * 60 * 1000;

function liveMessage(setup) {
  return setup.customMessage
    .replaceAll("{USERNAME}", setup.twitchUsername)
    .replaceAll("{URL}", `https://twitch.tv/${setup.twitchUsername}`);
}

async function announce(client, setup) {
  const where = `${setup.twitchUsername} (guild ${setup.guildId}, channel ${setup.notificationChannelId})`;
  const guild = client.guilds.cache.get(setup.guildId);
  const channel =
    guild &&
    (guild.channels.cache.get(setup.notificationChannelId) ||
      (await guild.channels
        .fetch(setup.notificationChannelId)
        .catch(() => null)));
  if (!channel) {
    logger.warn(`check-twitch: no channel to announce ${where}`);
    return false;
  }
  try {
    await channel.send(liveMessage(setup));
    return true;
  } catch (err) {
    logger.error(`check-twitch: failed to announce ${where}:`, err);
    return false;
  }
}

async function checkTwitch(client) {
  let setups;
  let live;
  try {
    setups = await NotificationConfig.find();
    if (!setups.length) return;
    live = await liveUserIds([...new Set(setups.map((s) => s.twitchUserId))]);
  } catch (error) {
    logger.error("check-twitch: failed:", error.response?.data ?? error);
    return;
  }

  for (const setup of setups) {
    const isLive = live.has(setup.twitchUserId);
    if (isLive === setup.isLivePreviously) continue;
    try {
      // saved only after the send worked, so a failed send is tried again next check
      if (isLive) {
        if (!(await announce(client, setup))) continue;
        setup.lastNotificationSentAt = new Date();
      }
      setup.isLivePreviously = isLive;
      await setup.save();
    } catch (error) {
      logger.error(`check-twitch: failed for ${setup.twitchUsername}:`, error);
    }
  }
}

let interval;

module.exports = (client) => {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    logger.warn(
      "check-twitch: TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is not set, Twitch notifications are disabled.",
    );
    return;
  }
  // clientReady can fire again after a reconnect; keep a single timer
  if (interval) clearInterval(interval);
  checkTwitch(client);
  interval = setInterval(() => checkTwitch(client), CHECK_EVERY_MS);
};
