const { EmbedBuilder } = require("discord.js");
const GoodbyeSetup = require("../../schemas/goodbyeSchema");
const logger = require("../../extra/logger");

const MAIN = process.env.MAIN;
const ALT = process.env.ALT;

// Export a function that will be called when a new member joins the server
module.exports = async (member) => {
  if (member.id === MAIN || member.id === ALT) return;

  // Get the ID of the guild the member joined
  const guildId = member.guild.id;

  // Find the goodbye setup for this guild in the database
  const existingSetup = await GoodbyeSetup.findOne({ guildId: guildId });

  if (!existingSetup) return;

  // Get the channel where the goodbye message should be sent
  const channel = member.guild.channels.cache.get(existingSetup.channelId);

  if (!channel) {
    logger.error(`Error: Channel not found for guild ${guildId}`);
    return;
  }

  const me = member.guild.members.me;
  const needed = existingSetup.useEmbed
    ? ["ViewChannel", "SendMessages", "EmbedLinks"]
    : ["ViewChannel", "SendMessages"];
  if (!channel.permissionsFor(me)?.has(needed)) {
    logger.error(
      `Missing ${needed.join("/")} permission in goodbye channel ${existingSetup.channelId} for guild "${member.guild.name}" (${guildId})`,
    );
    return;
  }

  // Get the goodbye message content from the database
  let messageContent = existingSetup.goodbyeMessage

    // Replace placeholders in the message with actual values
    .replace("{SERVER_MEMBER}", member.guild.memberCount)
    .replace("{USER_MENTION}", `<@${member.id}>`)
    .replace("{USER_NAME}", member.user.username)
    .replace("{SERVER_NAME}", member.guild.name);

  const userAvatar = member.user.displayAvatarURL({
    // Getting the user's avatar URL
    format: "png",
    dynamic: true,
  });

  try {
    // If the setup specifies to use an embed, create a new embed
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
