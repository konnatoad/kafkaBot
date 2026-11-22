const { DEFAULT_WORDS, findBlockedWord } = require("./blockedWords");

// Keep the report filter independent of per-server confession settings.
// Use whole words unless the stem is specific enough to block its inflections.
const REPORT_WORDS = [...DEFAULT_WORDS];

const REPORT_PHRASES = [];

function hasOffensiveReportText(text) {
  const normalized = text
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")
    .toLowerCase();
  // Punctuation can also stand in for letters. Check both readings.
  const words = normalized.replace(/[!@$]+(?=\s|$|[.,;:?])/gu, " ");
  const phrases = words.replace(/[^\p{L}\p{N}]+/gu, " ");
  return (
    Boolean(findBlockedWord(words, REPORT_WORDS)) ||
    (words !== normalized &&
      Boolean(findBlockedWord(normalized, REPORT_WORDS))) ||
    REPORT_PHRASES.some((pattern) => pattern.test(phrases))
  );
}

module.exports = { hasOffensiveReportText };
