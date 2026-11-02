const axios = require("axios");
const { EmbedBuilder, Colors } = require("discord.js");
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
/** `2026-11-10` as "10 November 2026"; anything else is shown as written */
function writtenDate(text) {
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
const FIELD_MAX = 1024;
const NAME_MAX = 256;
/**
 * one version as an embed page, the title, date written out, one per section with a `•` line per item
 * and where it sits in the list in the footer
 * section too long for one field carries on in another field with the same name
 */
function versionPage(entry, index, total) {
  const fields = [];
  for (const section of entry.sections) {
    const name = section.name.slice(0, NAME_MAX);
    let value = "";
    for (const item of section.items) {
      const line = `• ${item}`.slice(0, FIELD_MAX);
      if (value && value.length + 1 + line.length > FIELD_MAX) {
        fields.push({ name, value });
        value = "";
      }
      value = value ? `${value}\n${line}` : line;
    }
    if (value) fields.push({ name, value });
  }
  const date = entry.date ? writtenDate(entry.date) : null;
  const empty = fields.length === 0 ? "nothing written for this version yet" : null;
  const embed = new EmbedBuilder()
    .setColor(Colors.Purple)
    .setTitle(`kafkaBot ${entry.version}`)
    .setFooter({ text: `${index + 1} of ${total} • newest first` });
  const description = [date, empty].filter(Boolean).join("\n\n");
  if (description) embed.setDescription(description);
  if (fields.length > 0) embed.addFields(fields.slice(0, 25));
  return embed;
}

module.exports = { parseChangelog, getChangelog, versionPage };
