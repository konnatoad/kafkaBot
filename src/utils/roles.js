const { PermissionFlagsBits } = require("discord.js");

/**
 * Why the bot couldn't hand out `role`, or null when it can. Checked when a role
 * is set up, so autorole, reaction roles and the store don't fail on every use.
 */
function whyBotCantGive(guild, role) {
  const me = guild.members.me;
  if (role.id === guild.id) return "@everyone can't be given out.";
  if (role.managed)
    return `${role} belongs to an integration and can't be given out.`;
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return "I need the **Manage Roles** permission to give roles.";
  }
  if (role.comparePositionTo(me.roles.highest) >= 0) {
    return `${role} is above my highest role, so I can't give it. Move my role above it in Server Settings → Roles.`;
  }
  return null;
}

module.exports = { whyBotCantGive };
