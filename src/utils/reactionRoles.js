const reactions = require("../schemas/reactions");

/**
 * The member and the role a reaction role gives, or null when the reaction
 * isn't one. Emoji are stored the way they're typed into /reaction-roles:
 * "<:name:id>", "<a:name:id>" or the character itself, which is what
 * emoji.toString() gives.
 */
async function reactionRole(reaction, user) {
  const { guildId, id: messageId } = reaction.message;
  if (!guildId || user.bot) return null;

  const setup = await reactions.findOne({
    Guild: guildId,
    Message: messageId,
    Emoji: reaction.emoji.toString(),
  });
  if (!setup?.Role) return null;

  const guild =
    reaction.message.guild ?? (await reaction.client.guilds.fetch(guildId));
  const member = await guild.members.fetch(user.id);
  return { member, roleId: setup.Role };
}

module.exports = { reactionRole };
