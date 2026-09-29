const logger = require("../../extra/logger");

const REPLY_CHANCE = 0.7;

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

  const replyChance = (text) => {
    if (Math.random() >= REPLY_CHANCE) return;
    return reply(text);
  };

  if (content === "ping") {
    const sent = await reply("pinging...");
    if (!sent) return;
    const roundTrip = sent.createdTimestamp - message.createdTimestamp;
    const wsPing = message.client.ws.ping;
    try {
      await sent.edit(`Pong! Latency: ${roundTrip}ms | API: ${wsPing}ms`);
    } catch (err) {
      logger.error(`Failed to edit ping reply in ${message.channelId};`, error)
    }
    return;
  }

  if (
    /\bgn\b/.test(content) ||
    /\bgoodnight\b/.test(content) ||
    /\bgood night\b/.test(content)
  ) {
    return replyChance("Goodnight!");
  }

  if (
    /\bgm\b/.test(content) ||
    /\bgoodmorning\b/.test(content) ||
    /\bgood morning\b/.test(content)
  ) {
    return replyChance("Good morning!");
  }

  if (
    /\bmeow\b/.test(content) ||
    /\bnya\b/.test(content) ||
    /\bpurr\b/.test(content)
  ) {
    return replyChance("Good kitty!");
  }

  if (
    /\bwoof\b/.test(content) ||
    /\barf\b/.test(content) ||
    /\bbark\b/.test(content)
  ) {
    return replyChance("Good puppy!");
  }
};
