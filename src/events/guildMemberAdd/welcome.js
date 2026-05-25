const { EmbedBuilder } = require("discord.js");
const WelcomeSetup = require("../../schemas/welcomeSchema");
const logger = require("../../extra/logger");

// Export a function that will be called when a new member joins the server
module.exports = async (member) => {
  // Get the ID of the guild the member joined
  const guildId = member.guild.id;

  // Find the welcome setup for this guild in the database
  const existingSetup = await WelcomeSetup.findOne({ guildId: guildId });

  if (!existingSetup) return;

  // Get the channel where the welcome message should be sent
  const channel = member.guild.channels.cache.get(existingSetup.channelId);

  if (!channel) {
    logger.error(`Error: Channel not found for guild ${guildId}`);
    return;
  }

  const me = member.guild.members.me;
  if (!channel.permissionsFor(me)?.has("SendMessages")) {
    logger.error(`Missing SendMessages permission in welcome channel ${existingSetup.channelId} for guild ${guildId}`);
    return;
  }

  // Get the welcome message content from the database
  let messageContent = existingSetup.welcomeMessage

    // Replace placeholders in the message with actual values
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
    logger.error(`Failed to send welcome message in guild ${guildId}:`, err);
  }
};
