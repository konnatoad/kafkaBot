// .osu files for pp calculations, downloaded once into src/extra/maps.
const axios = require("axios");
const fs = require("fs/promises");
const path = require("path");
const logger = require("../extra/logger");

const MAP_DIR = path.join(__dirname, "../extra/maps");

/** beatmap id -> the download in progress, so two requests share one */
const downloading = new Map();

const clean = (text) => text.replace(/^\uFEFF/, "").trim();

async function download(beatmapId, file) {
  const { data } = await axios.get(`https://osu.ppy.sh/osu/${beatmapId}`, {
    responseType: "arraybuffer",
    headers: { "User-Agent": "KafkaBot/1.0" },
  });
  if (!data.length) throw new Error("osu! sent an empty .osu file");
  await fs.mkdir(MAP_DIR, { recursive: true });
  // written to a temporary name first, so a crash mid-write never leaves a cut-off map
  const partial = `${file}.part`;
  await fs.writeFile(partial, data);
  await fs.rename(partial, file);
  logger.info(`Downloaded beatmap ${beatmapId}`);
  return clean(data.toString("utf8"));
}

/** The text of a beatmap's .osu file, or null when it can't be had. */
async function beatmapText(beatmapId) {
  const file = path.join(MAP_DIR, `${beatmapId}.osu`);
  const cached = await fs.readFile(file, "utf8").catch(() => "");
  if (cached.trim()) return clean(cached);

  if (!downloading.has(beatmapId)) {
    downloading.set(
      beatmapId,
      download(beatmapId, file)
        .catch((err) => {
          logger.warn(
            `Failed to download beatmap ${beatmapId}: ${err.message}`,
          );
          return null;
        })
        .finally(() => downloading.delete(beatmapId)),
    );
  }
  return downloading.get(beatmapId);
}

module.exports = { beatmapText };
