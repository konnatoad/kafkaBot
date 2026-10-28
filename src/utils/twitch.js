// Twitch Helix API with an app token from the client-credentials flow. Used by the
// live check and /twitchnotify.
const axios = require("axios");
const logger = require("../extra/logger");

let token = null;
let tokenExpiresAt = 0;

async function appToken() {
  if (token && Date.now() < tokenExpiresAt) return token;
  const { data } = await axios.post(
    "https://id.twitch.tv/oauth2/token",
    new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  );
  token = data.access_token;
  // a minute early, so a request never goes out on a token about to expire
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  logger.info("New Twitch API token acquired.");
  return token;
}

async function helix(path, params) {
  const request = async () =>
    axios.get(`https://api.twitch.tv/helix/${path}`, {
      params,
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${await appToken()}`,
      },
    });
  try {
    return (await request()).data.data;
  } catch (err) {
    // Twitch can revoke a token before it expires; get a new one and try once more
    if (err.response?.status !== 401) throw err;
    token = null;
    return (await request()).data.data;
  }
}

/** The user for a login name, or null if there is none. */
async function findUser(login) {
  const [user] = await helix("users", { login });
  return user ?? null;
}

/** The ids of `userIds` that are live right now. */
async function liveUserIds(userIds) {
  const live = new Set();
  // Helix takes at most 100 ids per request
  for (let i = 0; i < userIds.length; i += 100) {
    const params = new URLSearchParams();
    for (const id of userIds.slice(i, i + 100)) params.append("user_id", id);
    for (const stream of await helix("streams", params))
      live.add(stream.user_id);
  }
  return live;
}

/** "twitch.tv/Name", "https://www.twitch.tv/name/videos?x=1" or "name" -> "name". */
function loginFromUrl(input) {
  const trimmed = input.trim();
  const login = /^[A-Za-z0-9_]+$/.test(trimmed)
    ? trimmed
    : trimmed.match(/twitch\.tv\/([A-Za-z0-9_]+)/i)?.[1];
  return login ? login.toLowerCase() : null;
}

module.exports = { findUser, liveUserIds, loginFromUrl };
