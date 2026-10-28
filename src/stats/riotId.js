/** "Name#Tag" -> { name, tag }; either is null when missing. */
function splitRiotId(input) {
  const raw = String(input || "").trim();
  const idx = raw.lastIndexOf("#");
  if (idx === -1) return { name: null, tag: null };
  const name = raw.slice(0, idx).trim();
  const tag = raw.slice(idx + 1).trim();
  return { name: name || null, tag: tag || null };
}

module.exports = { splitRiotId };
