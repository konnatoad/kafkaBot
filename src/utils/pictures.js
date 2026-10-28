// /cat, /dog and /kafka: a random picture from a folder in src/static.
const fs = require("fs");
const path = require("path");
const { pickOne } = require("./random");

const STATIC_DIR = path.join(__dirname, "../static");
// pictures shown this recently in a folder aren't picked again
const RECENT_LIMIT = 10;

/** folder -> the last RECENT_LIMIT pictures shown from it */
const recentByFolder = new Map();

/** Full path of a picture from src/static/<folder>, avoiding recent ones. */
function pickPicture(folder) {
  const files = fs.readdirSync(path.join(STATIC_DIR, folder));
  const recent = recentByFolder.get(folder) ?? [];
  const fresh = files.filter((file) => !recent.includes(file));
  const picture = pickOne(fresh.length ? fresh : files);
  recentByFolder.set(folder, [...recent, picture].slice(-RECENT_LIMIT));
  return path.join(STATIC_DIR, folder, picture);
}

module.exports = { pickPicture };
