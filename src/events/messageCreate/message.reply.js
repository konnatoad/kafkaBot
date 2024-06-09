module.exports = async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  if (content === "ping") {
    message.reply("pong");
    return;
  }

  if (
    content.includes("gn") ||
    content.includes("goodnight") ||
    content.includes("good night")
  ) {
    message.reply("Goodnight!");
    return;
  }

  if (
    content.includes("gm") ||
    content.includes("goodmorning") ||
    content.includes("good morning")
  ) {
    message.reply("Goodmorning!");
    return;
  }

  if (content.includes("meow") || content.includes("nya")) {
    message.reply("Good kitty!");
    return;
  }
};
