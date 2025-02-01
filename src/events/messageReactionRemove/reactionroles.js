const { Client, Events, MessageReaction, User } = require("discord.js");
const reactions = require("../../schemas/reactions");

module.exports = async (reaction, user) => {
  const client = reaction.message.client;

  if (!reaction.message.guildId) return;

  if (user.bot) return;

  let emojiID = reaction.emoji.id
    ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
    : reaction.emoji.name;
  if (reaction.emoji.animated) {
    emojiID = `<a:${reaction.emoji.name}:${reaction.emoji.id}>`;
  }

  const data = await reactions.findOne({
    Guild: reaction.message.guildId,
    Message: reaction.message.id,
    Emoji: emojiID,
  });

  if (!data) return;

  try {
    const guild = await client.guilds.fetch(reaction.message.guildId);
    if (!guild) return;

    const member = await guild.members.fetch(user.id);
    if (!member) return;

    if (!member || !data.Role) return;

    await member.roles.remove(data.Role);
  } catch (error) {
    console.error("Error in processing the reaction:", error);
  }
};
