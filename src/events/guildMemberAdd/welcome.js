const { EmbedBuilder } = require("discord.js");
const WelcomeSetup = require("../../schemas/welcomeSchema");
const logger = require("../../extra/logger");
const { alertMissingPermissions } = require("../../utils/permissionAlert");

module.exports = async (member) => {
  const guildId = member.guild.id;
  const existingSetup = await WelcomeSetup.findOne({ guildId: guildId });

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
    await alertMissingPermissions(member.guild, channel, missing, "welcome").catch((err) =>
      logger.error(`welcome: permission alert crashed for guild ${guildId}: ${err}`),
    );
    return;
  }

  let messageContent = existingSetup.welcomeMessage

    .replace("{SERVER_MEMBER}", member.guild.memberCount)
    .replace("{USER_MENTION}", `<@${member.id}>`)
    .replace("{USER_NAME}", member.user.username)
    .replace("{SERVER_NAME}", member.guild.name);

  try {
    if (existingSetup.useEmbed) {
      const embed = new EmbedBuilder()
        .setColor("Random")
        .setTitle("Welcome to server.")
        .setDescription(messageContent)
        .setTimestamp();

      await channel.send({ content: `<@${member.id}>`, embeds: [embed] });
    } else {
      await channel.send(messageContent);
    }
  } catch (err) {
    logger.error(`Failed to send welcome message in guild ${guildId}: ${err}`);
  }
};
