const NotificationConfig = require("../../schemas/twitchNotificationSchema");
const https = require("https");

async function fetchTwitchData(userLogin) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.twitch.tv",
      path: `/helix/streams?user_login=${userLogin}`,
      method: "GET",
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.data) console.error("Twitch API error:", parsed);
          resolve(parsed);
        } catch {
          reject(new Error(`Failed to parse Twitch response: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

async function sendNotification(notificationConfig, userLogin, client, guildCache, channelCache) {
  const { guildId, notificationChannelId } = notificationConfig;

  let targetGuild = guildCache.get(guildId);
  if (!targetGuild) {
    targetGuild =
      client.guilds.cache.get(guildId) ||
      (await client.guilds.fetch(guildId).catch(() => null));
    if (!targetGuild) {
      console.error(`Guild ${guildId} not found for ${userLogin}`);
      return;
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
      console.error(
        `Notification channel ${notificationChannelId} not found for ${userLogin}`,
      );
      return;
    }
    channelCache.set(channelCacheKey, targetChannel);
  }

  // Construct message with Twitch channel URL
  const twitchChannelUrl = `https://twitch.tv/${userLogin}`;
  const customMessage = notificationConfig.customMessage
    ? notificationConfig.customMessage.replace("{URL}", twitchChannelUrl)
    : `@everyone ${userLogin} is now live on Twitch! Check it out: ${twitchChannelUrl}`;

  // Send notification
  await targetChannel.send(customMessage);

  // Update lastNotificationSentAt and isLivePreviously
  notificationConfig.lastNotificationSentAt = new Date();
  notificationConfig.isLivePreviously = true;
  await notificationConfig.save();
}

let interval;

module.exports = (client) => {
  async function checkTwitch() {
    try {
      const notificationConfigs = await NotificationConfig.find();

      const guildCache = new Map();
      const channelCache = new Map();

      for (const notificationConfig of notificationConfigs) {
        const userLogin = notificationConfig.twitchUsername;

        const responseData = await fetchTwitchData(userLogin);

        const isLive =
          responseData && responseData.data && responseData.data.length > 0;

        await NotificationConfig.findByIdAndUpdate(notificationConfig._id, {
          isLive,
        });

        // Check if notification has been sent previously
        if (isLive && !notificationConfig.isLivePreviously) {
          // Send notification
          await sendNotification(notificationConfig, userLogin, client, guildCache, channelCache);
        } else if (!isLive && notificationConfig.isLivePreviously) {
          // Update isLivePreviously field
          notificationConfig.isLivePreviously = false;
          await notificationConfig.save();
        }
      }
    } catch (error) {
      console.error("Error checking Twitch status:", error);
    }
  }

  // Set interval to check Twitch
  if (interval) clearInterval(interval);
  checkTwitch();
  interval = setInterval(checkTwitch, 300000);
};
