const {
  Client,
  Events,
  EmbedBuilder,
  Message,
  MessageReaction,
} = require("discord.js");
const reactions = require("../../schemas/reactions");

module.exports = async (reaction, user, client) => {
  if (!reaction.message.guildId) return;
  if (user.bot) return;

  let cID = `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
  if (!reaction.emoji.id) cID = reaction.emoji.name;

  const data = await reactions.findOne({
    Guild: reaction.message.guildId,
    Message: reaction.message.id,
    Emoji: cID,
  });
  if (!data) return;

  const guild = await client.guilds.cache.get(reaction.message.guildId);
  const member = await guild.members.cache.get(user.id);

  try {
    await member.roles.add(data.Role);
  } catch (e) {
    return;
  }
};
