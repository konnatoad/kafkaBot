// Discord only checks the bot's own rank when it bans or kicks, so without this a
// moderator could remove anyone the bot outranks, admins above them included.
// Returns why `target` can't be moderated, or null when it can.
function whyCantModerate(interaction, target, verb) {
  const { guild, member: moderator } = interaction;
  if (target.id === moderator.id) return `you can't ${verb} yourself`;
  if (target.id === guild.ownerId) return `you can't ${verb} the server owner`;
  if (target.id === interaction.client.user.id)
    return `i'm not going to ${verb} myself`;
  if (
    moderator.id !== guild.ownerId &&
    target.roles.highest.comparePositionTo(moderator.roles.highest) >= 0
  )
    return `you can't ${verb} someone with the same or a higher role than you`;
  if (
    target.roles.highest.comparePositionTo(guild.members.me.roles.highest) >= 0
  )
    return `i can't ${verb} someone with the same or a higher role than me`;
  return null;
}

module.exports = { whyCantModerate };
