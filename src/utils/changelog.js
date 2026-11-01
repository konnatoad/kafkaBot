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

module.exports = { parseChangelog };
