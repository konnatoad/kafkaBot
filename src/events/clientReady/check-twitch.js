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
        resolve(JSON.parse(data));
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

async function sendNotification(notificationConfig, userLogin, client) {
  const targetGuild =
    client.guilds.cache.get(notificationConfig.guildId) ||
    (await client.guilds.fetch(notificationConfig.guildId));

  if (!targetGuild) {
    console.error(
      `Guild ${notificationConfig.guildId} not found for ${userLogin}`
    );
    return;
  }

  const targetChannel =
    targetGuild.channels.cache.get(notificationConfig.notificationChannelId) ||
    (await targetGuild.channels.fetch(
      notificationConfig.notificationChannelId
    ));

  if (!targetChannel) {
    console.error(
      `Notification channel ${notificationConfig.notificationChannelId} not found for ${userLogin}`
    );
    return;
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

module.exports = (client) => {
  let interval;

  async function checkTwitch() {
    try {
      const notificationConfigs = await NotificationConfig.find();

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
          await sendNotification(notificationConfig, userLogin, client);
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
