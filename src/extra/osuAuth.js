const axios = require("axios");
const logger = require("./logger");

let osuAccessToken = null;
let tokenExpiration = 0; // unix seconds

async function getOsuAccessToken() {
  const currentTime = Math.floor(Date.now() / 1000);

  if (osuAccessToken && currentTime < tokenExpiration) {
    return osuAccessToken;
  }

  try {
    const response = await axios.post("https://osu.ppy.sh/oauth/token", {
      client_id: process.env.OSU_CLIENT_ID,
      client_secret: process.env.OSU_CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "public",
    });

    osuAccessToken = response.data.access_token;
    tokenExpiration = currentTime + response.data.expires_in - 10; // Store expiration time (minus 10s buffer)

    logger.info("🔑 New osu! API token acquired.");
    return osuAccessToken;
  } catch (error) {
    logger.error(
      "Failed to get osu! access token:",
      error.response?.data || error.message,
    );
    return null;
  }
}

module.exports = { getOsuAccessToken };
