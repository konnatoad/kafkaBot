const { AutoModerationActionType } = require("discord.js");
const AutoModConfig = require("../../schemas/AutoModConfig");
const { addWarning } = require("../../utils/addWarning");
const logger = require("../../extra/logger");

module.exports = async (execution) => {
  try {
    if (!execution.guild || !execution.userId) return;

    // every rule we create has both a block action and an alert action, discord
    // fires a separate event per action, only warn once off the block one
    if (execution.action?.type !== AutoModerationActionType.BlockMessage) return;

    const cfg = await AutoModConfig.findOne({ guildId: execution.guild.id });
    if (!cfg || !cfg.autoWarn) return;

    const target = await execution.guild.members.fetch(execution.userId).catch(() => null);
    if (!target || target.user.bot) return;

    const reason = execution.matchedKeyword
      ? `automod: matched "${execution.matchedKeyword}"`
      : "automod: triggered a rule";

    await addWarning({
      guildId: execution.guild.id,
      userId: target.id,
      userTag: target.user.username,
      executerId: execution.guild.client.user.id,
      executerTag: "automod",
      reason,
    });
  } catch (error) {
    logger.error(`automod autowarn error: ${error}`);
  }
};
