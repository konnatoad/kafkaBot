const { EmbedBuilder } = require("discord.js");
const GoodbyeSetup = require("../../schemas/goodbyeSchema");
const logger = require("../../extra/logger");
const { alertMissingPermissions } = require("../../utils/permissionAlert");

const MAIN = process.env.MAIN;
const ALT = process.env.ALT;

module.exports = async (member) => {
  if (member.id === MAIN || member.id === ALT) return;

  const guildId = member.guild.id;
  const existingSetup = await GoodbyeSetup.findOne({ guildId: guildId });

  if (!existingSetup) return;

  const channel = member.guild.channels.cache.get(existingSetup.channelId);

  if (!channel) {
    logger.error(`Error: Channel not found for guild ${guildId}`);
    return;
  }

  const me = member.guild.members.me;
  const needed = existingSetup.useEmbed
    ? ["ViewChannel", "SendMessages", "EmbedLinks"]
    : ["ViewChannel", "SendMessages"];
  const missing = channel.permissionsFor(me)?.missing(needed) ?? needed;
  if (missing.length) {
    await alertMissingPermissions(member.guild, channel, missing, "goodbye").catch((err) =>
      logger.error(`goodbye: permission alert crashed for guild ${guildId}: ${err}`),
    );
    return;
  }

  let messageContent = existingSetup.goodbyeMessage

    .replace("{SERVER_MEMBER}", member.guild.memberCount)
    .replace("{USER_MENTION}", `<@${member.id}>`)
    .replace("{USER_NAME}", member.user.username)
    .replace("{SERVER_NAME}", member.guild.name);

  const userAvatar = member.user.displayAvatarURL({
    format: "png",
    dynamic: true,
  });

  try {
    if (existingSetup.useEmbed) {
      const embed = new EmbedBuilder()
        .setColor("Random")
        .setTitle("User left the server.")
        .setThumbnail(userAvatar)
        .setDescription(messageContent)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } else {
      // If not using an embed, send a plain message to the channel
      await channel.send(messageContent);
    }
  } catch (err) {
    logger.error(
      `Failed to send goodbye message in guild "${member.guild.name}" (${guildId}): ${err}`,
    );
  }
};
