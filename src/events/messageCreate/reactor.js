const { EmbedBuilder } = require("discord.js");
const reactor = require("../../schemas/reactorschema");
const logger = require("../../extra/logger");
const { alertMissingPermissions } = require("../../utils/permissionAlert");

// reacting needs Read Message History too, when nobody has reacted yet
const NEEDED = ["ViewChannel", "AddReactions", "ReadMessageHistory"];
const OWNER_DM_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** channel id -> when the owner was last told its reactor is broken */
const lastOwnerDm = new Map();

// Every message in the channel hits the same broken emoji, so the owner hears
// about it once a day per channel instead of once per message.
async function tellOwner(message, err) {
  const last = lastOwnerDm.get(message.channelId) ?? 0;
  if (Date.now() - last < OWNER_DM_COOLDOWN_MS) return;
  lastOwnerDm.set(message.channelId, Date.now());

  logger.warn(
    `reactor: can't react in guild ${message.guild.id}, channel ${message.channelId}: ${err}`,
  );
  const owner = await message.guild.fetchOwner().catch(() => null);
  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setDescription(
      `Hello there, it looks like I have found an error with the reactor system for your server - **${message.channel}** - and I thought I would bring it to your attention: \`${err}\``,
    );
  await owner?.send({ embeds: [embed] }).catch((dmErr) => {
    // 50007: their DMs are closed
    if (dmErr.code !== 50007)
      logger.error("reactor: failed to DM owner:", dmErr);
  });
}

module.exports = async (message) => {
  if (!message.guild) return;
  try {
    const setup = await reactor.findOne({
      Guild: message.guild.id,
      Channel: message.channel.id,
    });
    if (!setup?.Emojis?.length) return;

    const missing =
      message.channel
        .permissionsFor(message.guild.members.me)
        ?.missing(NEEDED) ?? NEEDED;
    if (missing.length) {
      await alertMissingPermissions(
        message.guild,
        message.channel,
        missing,
        "reactor",
      );
      return;
    }

    for (const emoji of setup.Emojis) {
      try {
        await message.react(emoji);
      } catch (err) {
        await tellOwner(message, err);
        break;
      }
    }
  } catch (error) {
    logger.error(`reactor: failed in guild ${message.guild.id}:`, error);
  }
};
