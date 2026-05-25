const logger = require("../../extra/logger");
module.exports = async (message) => {
  if (
    message.author.bot ||
    message.guild.id === "853479679914409994"
    // message.guild.id === "721847737339084865"
  )
    return;

  const me = message.guild.members.me;
  if (!message.channel.permissionsFor(me)?.has("SendMessages")) return;

  const content = message.content.toLowerCase();

  const reply = async (text) => {
    try {
      await message.reply(text);
    } catch (err) {
      logger.error(`Failed to reply in channel ${message.channelId}:`, err);
    }
  };

  if (content === "ping") {
    return reply("pong");
  }

  if (
    /\bgn\b/.test(content) ||
    /\bgoodnight\b/.test(content) ||
    /\bgood night\b/.test(content)
  ) {
    return reply("Goodnight!");
  }

  if (
    /\bgm\b/.test(content) ||
    /\bgoodmorning\b/.test(content) ||
    /\bgood morning\b/.test(content)
  ) {
    return reply("Good morning!");
  }

  if (
    /\bmeow\b/.test(content) ||
    /\bnya\b/.test(content) ||
    /\bpurr\b/.test(content)
  ) {
    return reply("Good kitty!");
  }

  if (
    /\bwoof\b/.test(content) ||
    /\barf\b/.test(content) ||
    /\bbark\b/.test(content)
  ) {
    return reply("Good puppy!");
  }
};
