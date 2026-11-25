const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { cleanWord, findBlockedWord } = require("./blockedWords");
const logger = require("../extra/logger");

function loadReportWords() {
  const file =
    process.env.BUG_REPORT_WORDS_FILE ??
    resolve(__dirname, "../../bug-report-words.json");

  try {
    const { words, phrases } = JSON.parse(readFileSync(file, "utf8"));
    if (
      !Array.isArray(words) ||
      !words.every((word) => typeof word === "string" && cleanWord(word)) ||
      !Array.isArray(phrases) ||
      !phrases.every(
        (phrase) => typeof phrase === "string" && phraseWords(phrase),
      )
    ) {
      throw new Error("Invalid wordlist format");
    }
    return {
      words,
      phrases: phrases.map((phrase) => ` ${phraseWords(phrase)} `),
    };
  } catch {
    logger.warn(
      "bugreport: private wordlist missing or invalid; reports still require approval",
    );
    return { words: [], phrases: [] };
  }
}

function phraseWords(text) {
  return text
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const reportWords = loadReportWords();

function hasOffensiveReportText(text) {
  const normalized = text
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")
    .toLowerCase();
  // Punctuation can also stand in for letters. Check both readings.
  const words = normalized.replace(/[!@$]+(?=\s|$|[.,;:?])/gu, " ");
  const phrases = ` ${phraseWords(words)} `;
  return (
    Boolean(findBlockedWord(words, reportWords.words)) ||
    (words !== normalized &&
      Boolean(findBlockedWord(normalized, reportWords.words))) ||
    reportWords.phrases.some((phrase) => phrases.includes(phrase))
  );
}

module.exports = { hasOffensiveReportText };
