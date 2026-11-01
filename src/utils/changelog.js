const axios = require("axios");
const logger = require("../extra/logger");
/**
 * The changelog paste's text as versions, in the order they're written
 * `## 1.10.1 · 2026-10-29`, then `### section` headings and then finally `- item` lines
 * Anything before the first `##` is ignored, so notes can go at the top.
 */
function parseChangelog(text) {
  const versions = [];
  let section = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      const [version, date] = line.slice(3).split(/\s+[·-]\s+/);
      versions.push({ version: version.trim(), date: date?.trim() || null, sections: [] });
      section = null;
    } else if (line.startsWith("### ") && versions.length > 0) {
      section = { name: line.slice(4).trim(), items: [] };
      versions.at(-1).sections.push(section);
    } else if (line.startsWith("- ") && section) {
      section.items.push(line.slice(2).trim());
    }
  }
  return versions;
}

const CACHE_FOR = 5 * 60 * 1000;
let cached = null;
/**
 * changelogs verions from the bomzh.fm paste at CHANGELOG_URL in .env
 * bomzh is asked at most every 5 minutes
 * when it can't be reached the last copy is used and it's tried again 5 min later
 * throws when there's no link in .env, or when the very first fetch fails
 */
async function getChangelog() {
  if (cached && Date.now() - cached.at < CACHE_FOR) return cached.versions;
  const url = process.env.CHANGELOG_URL;
  if (!url) throw new Error("CHANGELOG_URL isn't set in .env");
  try {
    const { data } = await axios.get(url, {
      timeout: 5000,
      maxContentLength: 200 * 1024,
      responseType: "text",
    });
    const versions = parseChangelog(data);
    if (versions.length === 0) {
      throw new Error("the changelog has no versions, is CHANGELOG_URL the paste's /raw/ link?");
    }
    cached = { versions, at: Date.now() };
  } catch (error) {
    if (!cached) throw error;
    logger.warn(`/changelog: couldn't fetch the changelog, using the last copy: ${error.message}`);
    cached.at = Date.now();
  }
  return cached.versions;
}

module.exports = { parseChangelog, getChangelog };
