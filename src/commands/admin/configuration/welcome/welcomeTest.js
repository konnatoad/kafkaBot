const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const WelcomeSetup = require("../../../../schemas/welcomeSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome-test")
    .setDescription("Test the welcome message for the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  run: async ({ interaction }) => {
    // Defining the function to be executed when the slash command is run
    const guildId = interaction.guild.id; // Getting the ID of the server
    const existingSetup = await WelcomeSetup.findOne({ guildId }); // Retrieving the welcome message configuration for the server
    if (!existingSetup) {
      return await interaction.reply({
        content: "No welcome setup found for this server.",
        flags: MessageFlags.Ephemeral,
      });
    }
    const channel = interaction.guild.channels.cache.get(
      // Getting the welcome channel from the server's channels
      existingSetup.channelId
    );
    if (!channel) {
      return await interaction.reply({
        content: "The configured welcome channel does not exist.",
        flags: MessageFlags.Ephemeral,
      });
    }
    const userAvatar = interaction.user.displayAvatarURL({
      // Getting the user's avatar URL
      format: "png",
      dynamic: true,
    });

    let messageContent = existingSetup.welcomeMessage // Getting the welcome message content
      .replace("{SERVER_MEMBER}", interaction.guild.memberCount) // Replacing placeholders with actual values
      .replace("{USER_MENTION}", `<@${interaction.user.id}>`)
      .replace("{USER_NAME}", interaction.user.username)
      .replace("{SERVER_NAME}", interaction.guild.name);

    if (existingSetup.useEmbed) {
      // If the configuration specifies using an embed
      const embed = new EmbedBuilder()
        .setColor("Random")
        .setTimestamp()
        .setTitle("Welcome")
        .setThumbnail(userAvatar)
        .setFooter({ text: interaction.guild.name })
        .setDescription(messageContent);

      await channel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [embed],
      });
    } else {
      // If the configuration does not specify using an embed
      await channel.send(messageContent); // Sending the welcome message as a plain text
    }

    await interaction.reply({
      content: `Welcome message sent successfully! ${channel}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
