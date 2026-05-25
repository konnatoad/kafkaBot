const { Client, GuildMember } = require("discord.js");
const AutoRole = require("../../schemas/AutoRole");
const logger = require("../../extra/logger");

/**
 *
 * @param {Client} client
 * @param {GuildMember} member
 */
module.exports = async (member) => {
  try {
    let guild = member.guild;
    //if (!guild) return;
    if (member.user.bot) return;

    const autoRole = await AutoRole.findOne({ guildId: guild.id });
    if (!autoRole) return;

    await member.roles.add(autoRole.roleId);
  } catch (error) {
    logger.error(`error giving role automatically: ${error}`);
  }
};
