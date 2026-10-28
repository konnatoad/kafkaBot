// YouTube Data API calls shared by /notification-setup and the upload check.
const axios = require("axios");

const API = "https://www.googleapis.com/youtube/v3";

/** channel id -> uploads playlist id; it never changes, so it's fetched once */
const uploadsPlaylists = new Map();

/** { title, uploadsPlaylistId } for a channel id, or null if there's no such channel. */
async function findChannel(channelId) {
  const { data } = await axios.get(`${API}/channels`, {
    params: {
      part: "snippet,contentDetails",
      id: channelId,
      key: process.env.YOUTUBE_API_KEY,
    },
  });
  const channel = data.items?.[0];
  if (!channel) return null;
  const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
  uploadsPlaylists.set(channelId, uploadsPlaylistId);
  return { title: channel.snippet.title, uploadsPlaylistId };
}

/** The newest upload of a channel, or null when it has none. */
async function latestUpload(channelId) {
  const playlistId =
    uploadsPlaylists.get(channelId) ??
    (await findChannel(channelId))?.uploadsPlaylistId;
  if (!playlistId) return null;
  const { data } = await axios.get(`${API}/playlistItems`, {
    params: {
      part: "snippet",
      playlistId,
      maxResults: 1,
      key: process.env.YOUTUBE_API_KEY,
    },
  });
  const snippet = data.items?.[0]?.snippet;
  if (!snippet) return null;
  return {
    id: snippet.resourceId.videoId,
    title: snippet.title,
    link: `https://www.youtube.com/watch?v=${snippet.resourceId.videoId}`,
    pubDate: snippet.publishedAt,
    channelTitle: snippet.channelTitle,
    channelLink: `https://www.youtube.com/channel/${channelId}`,
  };
}

/** "quotaExceeded: The request cannot be completed… (403)" */
function describeApiError(err) {
  const reason = err.response?.data?.error?.errors?.[0]?.reason ?? "unknown";
  const detail =
    err.response?.data?.error?.message ?? err.message ?? String(err);
  return `${reason}: ${detail} (${err.response?.status ?? "no status"})`;
}

module.exports = { findChannel, latestUpload, describeApiError };
