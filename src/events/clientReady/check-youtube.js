const axios = require("axios");
const NotificationConfig = require("../../schemas/NotificationConfig");
const logger = require("../../extra/logger");

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const uploadsPlaylistCache = new Map();

// Failure tracker: channelId -> { count, firstFailAt, lastFailAt, lastRecoveredAt, wasFailingLastCycle }
const failureTracker = new Map();

async function getUploadsPlaylistId(ytChannelId) {
  if (uploadsPlaylistCache.has(ytChannelId)) return uploadsPlaylistCache.get(ytChannelId);
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${ytChannelId}&key=${YOUTUBE_API_KEY}`;
  const res = await axios.get(url);
  const playlistId = res.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (playlistId) uploadsPlaylistCache.set(ytChannelId, playlistId);
  return playlistId ?? null;
}

async function fetchLatestVideo(ytChannelId) {
  const playlistId = await getUploadsPlaylistId(ytChannelId);
  if (!playlistId) return null;
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=1&key=${YOUTUBE_API_KEY}`;
  const res = await axios.get(url);
  const item = res.data.items?.[0];
  if (!item) return null;
  const snippet = item.snippet;
  return {
    id: snippet.resourceId.videoId,
    title: snippet.title,
    link: `https://www.youtube.com/watch?v=${snippet.resourceId.videoId}`,
    pubDate: snippet.publishedAt,
    channelTitle: snippet.channelTitle,
    channelLink: `https://www.youtube.com/channel/${ytChannelId}`
  };
}

module.exports = (client) => {
  if (!YOUTUBE_API_KEY) {
    logger.warn("check-youtube: YOUTUBE_API_KEY is not set, YouTube notifications are disabled.");
    return;
  }

  checkYoutube();
  setInterval(checkYoutube, 60000);

  async function checkYoutube() {
    try {
      const notificationConfigs = await NotificationConfig.find();

      const guildCache = new Map();
      const channelCache = new Map();
      const feedCache = new Map();

      for (const notificationConfig of notificationConfigs) {
        const { ytChannelId } = notificationConfig;

        let latestVideo;
        if (feedCache.has(ytChannelId)) {
          latestVideo = feedCache.get(ytChannelId);
        } else {
          try {
            latestVideo = await fetchLatestVideo(ytChannelId);
          } catch (e) {
            const detail = e.response?.data?.error?.message ?? e.message ?? String(e);
            const reason = e.response?.data?.error?.errors?.[0]?.reason ?? "unknown";
            const status = e.response?.status ?? "no-status";
            const now = new Date();

            const tracker = failureTracker.get(ytChannelId) ?? { count: 0, firstFailAt: now, lastFailAt: null, lastRecoveredAt: null, wasFailingLastCycle: false };
            tracker.count++;
            tracker.lastFailAt = now;
            tracker.wasFailingLastCycle = true;
            if (tracker.count === 1) tracker.firstFailAt = now;
            failureTracker.set(ytChannelId, tracker);

            logger.warn(
              `check-youtube: failed to fetch latest video for channel ${ytChannelId}: ${detail} (reason: ${reason}, status: ${status}) ` +
              `[failure #${tracker.count}, first failed at ${tracker.firstFailAt.toISOString()}, UTC hour: ${now.getUTCHours()}:${String(now.getUTCMinutes()).padStart(2, "0")}]`
            );

            // Retry after 3 seconds to see if it's a momentary blip
            await new Promise(res => setTimeout(res, 3000));
            try {
              latestVideo = await fetchLatestVideo(ytChannelId);
              logger.info(`check-youtube: channel ${ytChannelId} recovered on immediate retry after ${Date.now() - now.getTime()}ms`);
              failureTracker.delete(ytChannelId);
            } catch (retryErr) {
              const retryDetail = retryErr.response?.data?.error?.message ?? retryErr.message ?? String(retryErr);
              const retryReason = retryErr.response?.data?.error?.errors?.[0]?.reason ?? "unknown";
              const retryStatus = retryErr.response?.status ?? "no-status";
              logger.warn(`check-youtube: retry also failed for channel ${ytChannelId}: ${retryDetail} (reason: ${retryReason}, status: ${retryStatus}) — not a momentary blip`);
              latestVideo = null;
            }
          }

          // Detect recovery: was failing last cycle, now succeeded
          if (latestVideo !== null) {
            const tracker = failureTracker.get(ytChannelId);
            if (tracker?.wasFailingLastCycle) {
              logger.info(`check-youtube: channel ${ytChannelId} recovered after ${tracker.count} failure(s). First failed at ${tracker.firstFailAt.toISOString()}, recovered at ${new Date().toISOString()}`);
              failureTracker.delete(ytChannelId);
            }
          }

          feedCache.set(ytChannelId, latestVideo);
        }

        if (!latestVideo) continue;

        const lastCheckedVid = notificationConfig.lastCheckedVid;

        if (
          !lastCheckedVid ||
          (latestVideo.id !== lastCheckedVid.id &&
            new Date(latestVideo.pubDate) > new Date(lastCheckedVid.pubDate))
        ) {
          const { guildId, notificationChannelId } = notificationConfig;

          let targetGuild = guildCache.get(guildId);
          if (!targetGuild) {
            targetGuild =
              client.guilds.cache.get(guildId) ||
              (await client.guilds.fetch(guildId).catch(() => null));
            if (!targetGuild) {
              await NotificationConfig.findOneAndDelete({ _id: notificationConfig._id });
              continue;
            }
            guildCache.set(guildId, targetGuild);
          }

          const channelCacheKey = `${guildId}:${notificationChannelId}`;
          let targetChannel = channelCache.get(channelCacheKey);
          if (!targetChannel) {
            targetChannel =
              targetGuild.channels.cache.get(notificationChannelId) ||
              (await targetGuild.channels.fetch(notificationChannelId).catch(() => null));
            if (!targetChannel) {
              await NotificationConfig.findOneAndDelete({ _id: notificationConfig._id });
              continue;
            }
            channelCache.set(channelCacheKey, targetChannel);
          }

          notificationConfig.lastCheckedVid = {
            id: latestVideo.id,
            pubDate: latestVideo.pubDate
          };

          try {
            await notificationConfig.save();
          } catch (e) {
            logger.error("check-youtube: failed to save lastCheckedVid:", e);
            continue;
          }

          const targetMessage =
            notificationConfig.customMessage
              ?.replace("{VIDEO_URL}", latestVideo.link)
              ?.replace("{VIDEO_TITLE}", latestVideo.title)
              ?.replace("{CHANNEL_URL}", latestVideo.channelLink)
              ?.replace("{CHANNEL_NAME}", latestVideo.channelTitle) ||
            `New upload by ${latestVideo.channelTitle}\n${latestVideo.link}`;

          await targetChannel.send(targetMessage);
        }
      }
    } catch (error) {
      logger.error(`error in ${__filename}:\n`, error);
    }
  }
};
