const AutoRole = require("../../schemas/AutoRole");
const logger = require("../../extra/logger");

// what Discord answers when the role was deleted or moved above the bot since
// /autorole-configure checked it: fixing that is up to the server's admins
const ADMIN_FIXABLE = {
  10011: "the role was deleted",
  50013: "the role is above mine",
};

module.exports = async (member) => {
  if (member.user.bot) return;
  const { guild } = member;
  let setup;
  try {
    setup = await AutoRole.findOne({ guildId: guild.id });
    if (!setup) return;
    await member.roles.add(setup.roleId);
  } catch (error) {
    const where = `guild "${guild.name}" (${guild.id}), role ${setup?.roleId}`;
    if (ADMIN_FIXABLE[error.code]) {
      logger.warn(
        `autorole: can't give the role in ${where}: ${ADMIN_FIXABLE[error.code]}`,
      );
    } else {
      logger.error(
        `autorole: failed in ${where}, member ${member.user.tag}:`,
        error,
      );
    }
  }
};
