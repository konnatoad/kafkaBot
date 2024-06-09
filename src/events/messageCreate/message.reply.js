module.exports = async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  if (content === "ping") {
    message.reply("pong");
    return;
  }

  if (
    /\bgn\b/.test(content) ||
    /\bgoodnight\b/.test(content) ||
    /\bgood night\b/.test(content)
  ) {
    message.reply("Goodnight!");
    return;
  }

  if (
    /\bgm\b/.test(content) ||
    /\bgoodmorning\b/.test(content) ||
    /\bgood morning\b/.test(content)
  ) {
    message.reply("Good morning!");
    return;
  }

  if (
    /\bmeow\b/.test(content) ||
    /\bnya\b/.test(content) ||
    /\bpurr\b/.test(content)
  ) {
    message.reply("Good kitty!");
    return;
  }

  if (
    /\bwoof\b/.test(content) ||
    /\barf\b/.test(content) ||
    /\bbark\b/.test(content)
  ) {
    message.reply("Good puppy!");
    return;
  }
};
