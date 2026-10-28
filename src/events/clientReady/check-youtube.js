const NotificationConfig = require("../../schemas/NotificationConfig");
const logger = require("../../extra/logger");
const { latestUpload, describeApiError } = require("../../utils/youtube");

const CHECK_EVERY_MS = 60 * 1000;
// Discord's answer when a channel really is gone
const UNKNOWN_CHANNEL = 10003;

/** ytChannelId -> { count, since } while its lookups keep failing */
const failing = new Map();

async function latestOrNull(ytChannelId) {
  try {
    const video = await latestUpload(ytChannelId);
    const streak = failing.get(ytChannelId);
    if (streak) {
      logger.info(
        `check-youtube: channel ${ytChannelId} recovered after ${streak.count} failed check(s) since ${streak.since.toISOString()}`,
      );
      failing.delete(ytChannelId);
    }
    return video;
  } catch (err) {
    const streak = failing.get(ytChannelId) ?? { count: 0, since: new Date() };
    streak.count++;
    failing.set(ytChannelId, streak);
    // once per streak: it's checked every minute
    if (streak.count === 1) {
      logger.warn(
        `check-youtube: can't get the latest upload of ${ytChannelId}: ${describeApiError(err)}`,
      );
    }
    return null;
  }
}

function uploadMessage(setup, video) {
  if (!setup.customMessage) {
    return `New upload by ${video.channelTitle}\n${video.link}`;
  }
  return setup.customMessage
    .replaceAll("{VIDEO_URL}", video.link)
    .replaceAll("{VIDEO_TITLE}", video.title)
    .replaceAll("{CHANNEL_URL}", video.channelLink)
    .replaceAll("{CHANNEL_NAME}", video.channelTitle);
}

async function announce(client, setup, video) {
  const where = `${setup.ytChannelId} (guild ${setup.guildId}, channel ${setup.notificationChannelId})`;
  const guild = client.guilds.cache.get(setup.guildId);
  let channel;
  try {
    channel =
      guild.channels.cache.get(setup.notificationChannelId) ||
      (await guild.channels.fetch(setup.notificationChannelId));
  } catch (err) {
    // only a channel Discord says is deleted removes the setup; anything else
    // (an outage, a timeout) just waits for the next upload
    if (err.code === UNKNOWN_CHANNEL) {
      await NotificationConfig.deleteOne({ _id: setup._id });
      logger.info(
        `check-youtube: channel was deleted, removed the setup for ${where}`,
      );
    } else {
      logger.warn(
        `check-youtube: couldn't fetch the channel for ${where}: ${err}`,
      );
    }
    return;
  }

  await channel
    .send(uploadMessage(setup, video))
    .catch((err) =>
      logger.error(`check-youtube: failed to announce ${where}:`, err),
    );
}

async function checkYoutube(client) {
  let setups;
  try {
    setups = await NotificationConfig.find();
  } catch (error) {
    logger.error("check-youtube: failed to load setups:", error);
    return;
  }
  // servers the bot has left keep their setup (in case it's re-added) but cost no API calls
  setups = setups.filter((setup) => client.guilds.cache.has(setup.guildId));

  const latest = new Map();
  for (const ytChannelId of new Set(setups.map((s) => s.ytChannelId))) {
    latest.set(ytChannelId, await latestOrNull(ytChannelId));
  }

  for (const setup of setups) {
    const video = latest.get(setup.ytChannelId);
    const last = setup.lastCheckedVid;
    const isNew =
      video &&
      (!last ||
        (video.id !== last.id &&
          new Date(video.pubDate) > new Date(last.pubDate)));
    if (!isNew) continue;

    try {
      // saved first, so a failed send doesn't announce the same video every minute
      setup.lastCheckedVid = { id: video.id, pubDate: video.pubDate };
      await setup.save();
      await announce(client, setup, video);
    } catch (error) {
      logger.error(`check-youtube: failed for ${setup.ytChannelId}:`, error);
    }
  }
}

module.exports = (client) => {
  if (!process.env.YOUTUBE_API_KEY) {
    logger.warn(
      "check-youtube: YOUTUBE_API_KEY is not set, YouTube notifications are disabled.",
    );
    return;
  }
  checkYoutube(client);
  setInterval(() => checkYoutube(client), CHECK_EVERY_MS);
};
