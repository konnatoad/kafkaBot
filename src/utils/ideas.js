// "> " in front of every line, cut to what an embed field holds
const quote = (text) =>
  text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")
    .slice(0, 1024);

// the quoted text back without the "> "
const unquote = (text) => text.replace(/^> /gm, "");

module.exports = { quote, unquote };
