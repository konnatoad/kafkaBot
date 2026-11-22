const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const BlockedWords = require("../schemas/BlockedWords");

function loadDefaultWords() {
  const file =
    process.env.CONFESSION_WORDS_FILE ??
    resolve(__dirname, "../../confession-words.json");
  try {
    const words = JSON.parse(readFileSync(file, "utf8"));
    if (
      Array.isArray(words) &&
      words.length &&
      words.every(
        (word) => typeof word === "string" && cleanWord(word) === word,
      )
    ) {
      return words;
    }
  } catch {
    // The error below omits file contents and JSON parser excerpts.
  }
  throw new Error("Private confession wordlist is missing or invalid.");
}

let confessionWords;
function defaultWords() {
  confessionWords ??= loadDefaultWords();
  return confessionWords;
}

const MAX_ADDED = 100;

const LEET = {
  0: "o",
  1: "i",
  3: "e",
  4: "a",
  5: "s",
  7: "t",
  "@": "a",
  $: "s",
  "!": "i",
};

// lowercase, no accents (ä → a), leetspeak undone
function plain(text) {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[013457@$!]/g, (c) => LEET[c]);
}

// what an admin typed, as it's stored; null when it isn't one word
function cleanWord(input) {
  const word = plain(input.trim());
  return /^[a-z]{2,32}\*?$/.test(word) ? word : null;
}

// Allow repeated letters and plural endings. A trailing * matches a prefix.
function toPattern(word) {
  const prefix = word.endsWith("*");
  const letters = [...word.replace(/\*$/, "")].map((c) => `${c}+`).join("");
  return new RegExp(prefix ? `^${letters}` : `^${letters}[sz]?$`);
}

function wordsIn(text) {
  const tokens = plain(text)
    .split(/[^a-z]+/)
    .filter(Boolean);

  // Join runs of single-letter tokens split by spaces or punctuation.
  const joined = [];
  let run = "";
  for (const token of tokens) {
    if (token.length === 1) {
      run += token;
      continue;
    }
    if (run.length > 2) joined.push(run);
    run = "";
  }
  if (run.length > 2) joined.push(run);

  return [...tokens, ...joined];
}

// the list entry the text hits first, or null
function findBlockedWord(text, words) {
  const safeWords = words
    .map((w) => cleanWord(String(w ?? "")))
    .filter(Boolean);
  const patterns = safeWords.map((w) => [w, toPattern(w)]);
  for (const word of wordsIn(text)) {
    const hit = patterns.find(([, p]) => p.test(word));
    if (hit) return hit[0];
  }
  return null;
}

// the defaults minus what the server turned off, plus what it added
async function blockedWordsFor(guildId) {
  const defaults = defaultWords();
  const doc = await BlockedWords.findOne({ guildId }).lean();
  const removed = new Set(doc?.removed ?? []);
  return [...defaults.filter((w) => !removed.has(w)), ...(doc?.added ?? [])];
}

module.exports = {
  defaultWords,
  MAX_ADDED,
  cleanWord,
  findBlockedWord,
  blockedWordsFor,
};
