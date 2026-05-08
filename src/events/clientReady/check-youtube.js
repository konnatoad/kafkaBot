const Parser = require("rss-parser");
const NotificationConfig = require("../../schemas/NotificationConfig");

const parser = new Parser();

module.exports = (client) => {
  checkYoutube();
  setInterval(checkYoutube, 60000);

  async function checkYoutube() {
    try {
      const notificationConfigs = await NotificationConfig.find();

      const guildCache = new Map();
      const channelCache = new Map();

      for (const notificationConfig of notificationConfigs) {
        const YOUTUBE_RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${notificationConfig.ytChannelId}`;

        const feed = await parser.parseURL(YOUTUBE_RSS_URL).catch((e) => {
          console.warn("check-youtube: failed to parse RSS feed:", e.message);
          return null;
        });

        if (!feed?.items.length) continue;

        const latestVideo = feed.items[0];
        const lastCheckedVid = notificationConfig.lastCheckedVid;

        if (
          !lastCheckedVid ||
          (latestVideo.id.split(":")[2] !== lastCheckedVid.id &&
            new Date(latestVideo.pubDate) > new Date(lastCheckedVid.pubDate))
        ) {
          const { guildId, notifiactionChannelId } = notificationConfig;

          let targetGuild = guildCache.get(guildId);
          if (!targetGuild) {
            targetGuild =
              client.guilds.cache.get(guildId) ||
              (await client.guilds.fetch(guildId).catch(() => null));
            if (!targetGuild) {
              await NotificationConfig.findOneAndDelete({
                _id: notificationConfig._id
              });
              continue;
            }
            guildCache.set(guildId, targetGuild);
          }

          const channelCacheKey = `${guildId}:${notifiactionChannelId}`;
          let targetChannel = channelCache.get(channelCacheKey);
          if (!targetChannel) {
            targetChannel =
              targetGuild.channels.cache.get(notifiactionChannelId) ||
              (await targetGuild.channels.fetch(notifiactionChannelId).catch(() => null));
            if (!targetChannel) {
              await NotificationConfig.findOneAndDelete({
                _id: notificationConfig._id
              });
              continue;
            }
            channelCache.set(channelCacheKey, targetChannel);
          }

          notificationConfig.lastCheckedVid = {
            id: latestVideo.id.split(":")[2],
            pubDate: latestVideo.pubDate
          };

          notificationConfig
            .save()
            .then(() => {
              const targetMessage =
                notificationConfig.customMessage
                  ?.replace("{VIDEO_URL}", latestVideo.link)
                  ?.replace("{VIDEO_TITLE}", latestVideo.title)
                  ?.replace("{CHANNEL_URL}", feed.link)
                  ?.replace("{CHANNEL_NAME}", feed.title) ||
                `New upload by ${feed.title}\n${latestVideo.link}`;

              targetChannel.send(targetMessage);
            })
            .catch((e) => {
              console.error("check-youtube: failed to save lastCheckedVid:", e);
            });
        }
      }
    } catch (error) {
      console.error(`error in ${__filename}:\n`, error);
    }
  }
};
