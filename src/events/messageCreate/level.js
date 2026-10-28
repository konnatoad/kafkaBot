const { EmbedBuilder } = require("discord.js");
const levelSchema = require("../../schemas/level");
const UserProfile = require("../../schemas/UserProfile");
const logger = require("../../extra/logger");
const { xpIgnoredChannels } = require("../../../config.json");

const XP_PER_MESSAGE = 1;
const LEVEL_UP_REWARD = 50;
/** Balance someone starts with the first time they talk. */
const STARTING_BALANCE = 25;

const xpForNextLevel = (level) => level * level * 20 + 20;

module.exports = async (message) => {
  const { guild, author, channel } = message;

  if (!guild || author.bot || xpIgnoredChannels.includes(message.channelId))
    return;

  try {
    // creates the profile on someone's first message, leaves it alone after
    await UserProfile.updateOne(
      { userId: author.id, Guild: guild.id },
      { $setOnInsert: { balance: STARTING_BALANCE } },
      { upsert: true },
    ).catch((err) => {
      // two first messages at once: the other one created it
      if (err.code !== 11000) throw err;
    });

    const data = await levelSchema.findOneAndUpdate(
      { Guild: guild.id, User: author.id },
      { $inc: { XP: XP_PER_MESSAGE }, $setOnInsert: { Level: 0 } },
      { upsert: true, returnDocument: "after" },
    );
    if (data.XP < xpForNextLevel(data.Level)) return;

    // only one of two racing messages gets to move Level on
    const levelled = await levelSchema.findOneAndUpdate(
      { _id: data._id, Level: data.Level },
      { $inc: { Level: 1 } },
      { returnDocument: "after" },
    );
    if (!levelled) return;
    await UserProfile.updateOne(
      { userId: author.id, Guild: guild.id },
      { $inc: { balance: LEVEL_UP_REWARD } },
    );

    const needed = channel.isThread()
      ? ["ViewChannel", "SendMessagesInThreads", "EmbedLinks"]
      : ["ViewChannel", "SendMessages", "EmbedLinks"];
    if (!channel.permissionsFor(guild.members.me)?.has(needed)) return;

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setDescription(
        `**${author}, you have reached level ${levelled.Level}!**`,
      );
    await channel.send({ embeds: [embed] });
  } catch (error) {
    logger.error(
      `level: failed in guild "${guild.name}" (${guild.id}), channel ${message.channelId}: ${error}`,
    );
  }
};
