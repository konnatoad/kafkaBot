const logger = require("../../extra/logger");
const { reactionRole } = require("../../utils/reactionRoles");

module.exports = async (reaction, user) => {
  try {
    const found = await reactionRole(reaction, user);
    await found?.member.roles.add(found.roleId);
  } catch (error) {
    logger.error(
      `reaction roles: failed to add a role in guild ${reaction.message.guildId}:`,
      error,
    );
  }
};
