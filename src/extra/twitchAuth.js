const axios = require("axios");
const logger = require("./logger");

let twitchAccessToken = null;
let tokenExpiration = 0;

async function getTwitchAccessToken() {
  const currentTime = Math.floor(Date.now() / 1000);
  if (twitchAccessToken && currentTime < tokenExpiration) {
    return twitchAccessToken;
  }

  try {
    const response = await axios.post(
      "https://id.twitch.tv/oauth2/token",
      new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    );
    twitchAccessToken = response.data.access_token;
    tokenExpiration = currentTime + response.data.expires_in - 60;
    logger.info("New Twitch API token acquired.");
    return twitchAccessToken;
  } catch (error) {
    logger.error(
      "Failed to get Twitch access token:",
      error.response?.data || error.message,
    );
    return null;
  }
}

module.exports = { getTwitchAccessToken };
