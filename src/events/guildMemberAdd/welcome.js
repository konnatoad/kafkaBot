const { EmbedBuilder } = require("discord.js");
const WelcomeSetup = require("../../schemas/welcomeSchema");

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
    console.error(`Error: Channel not found for guild ${guildId}`);
    return;
  }

  // Get the welcome message content from the database
  let messageContent = existingSetup.welcomeMessage

    // Replace placeholders in the message with actual values
    .replace("{SERVER_MEMBER}", member.guild.memberCount)
    .replace("{USER_MENTION}", `<@${member.id}>`)
    .replace("{USER_NAME}", member.user.username)
    .replace("{SERVER_NAME}", member.guild.name);

  // If the setup specifies to use an embed, create a new embed
  if (existingSetup.useEmbed) {
    const embed = new EmbedBuilder()
      .setColor("Random")
      .setTitle("Welcome to server.")
      .setDescription(messageContent)
      .setTimestamp();

    channel.send({ content: `<@${member.id}>`, embeds: [embed] });
  } else {
    // If not using an embed, send a plain message to the channel
    channel.send(messageContent);
  }
};
