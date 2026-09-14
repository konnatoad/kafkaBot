const { Client, GuildMember } = require("discord.js");
const AutoRole = require("../../schemas/AutoRole");
const logger = require("../../extra/logger");

/**
 *
 * @param {Client} client
 * @param {GuildMember} member
 */
module.exports = async (member) => {
  const guild = member.guild;
  let autoRole;
  try {
    if (member.user.bot) return;

    autoRole = await AutoRole.findOne({ guildId: guild.id });
    if (!autoRole) return;

    await member.roles.add(autoRole.roleId);
  } catch (error) {
    logger.error(
      `error giving role automatically in guild "${guild?.name}" (${guild?.id}), role ${autoRole?.roleId}, member ${member.user?.tag}: ${error}`
    );
  }
};
