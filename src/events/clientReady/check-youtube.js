const axios = require("axios");
const NotificationConfig = require("../../schemas/NotificationConfig");
const logger = require("../../extra/logger");

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const uploadsPlaylistCache = new Map();

const ytApiHeaders = { headers: { "x-goog-api-key": YOUTUBE_API_KEY } };

async function getUploadsPlaylistId(ytChannelId) {
  if (uploadsPlaylistCache.has(ytChannelId)) return uploadsPlaylistCache.get(ytChannelId);
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${ytChannelId}`;
  const res = await axios.get(url, ytApiHeaders);
  const playlistId = res.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (playlistId) uploadsPlaylistCache.set(ytChannelId, playlistId);
  return playlistId ?? null;
}

async function fetchLatestVideo(ytChannelId) {
  const playlistId = await getUploadsPlaylistId(ytChannelId);
  if (!playlistId) return null;
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=1`;
  const res = await axios.get(url, ytApiHeaders);
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
            logger.warn(`check-youtube: failed to fetch latest video for channel ${ytChannelId}:`, e.message);
            latestVideo = null;
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
