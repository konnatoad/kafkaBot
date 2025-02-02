const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const GoodbyeSetup = require("../../../../schemas/goodbyeSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("goodbye-test")
    .setDescription("Test the goodbye message for the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  run: async ({ interaction }) => {
    // Defining the function to be executed when the slash command is run
    const guildId = interaction.guild.id; // Getting the ID of the server
    const existingSetup = await GoodbyeSetup.findOne({ guildId }); // Retrieving the goodbye message configuration for the server
    if (!existingSetup) {
      return await interaction.reply({
        content: "No goodbye setup found for this server.",
        flags: MessageFlags.Ephemeral,
      });
    }
    const channel = interaction.guild.channels.cache.get(
      // Getting the goodbye channel from the server's channels
      existingSetup.channelId
    );
    if (!channel) {
      return await interaction.reply({
        content: "The configured goodbye channel does not exist.",
        flags: MessageFlags.Ephemeral,
      });
    }
    const userAvatar = interaction.user.displayAvatarURL({
      // Getting the user's avatar URL
      format: "png",
      dynamic: true,
    });

    let messageContent = existingSetup.goodbyeMessage // Getting the goodbye message content
      .replace("{SERVER_MEMBER}", interaction.guild.memberCount) // Replacing placeholders with actual values
      .replace("{USER_MENTION}", `<@${interaction.user.id}>`)
      .replace("{USER_NAME}", interaction.user.username)
      .replace("{SERVER_NAME}", interaction.guild.name);

    if (existingSetup.useEmbed) {
      // If the configuration specifies using an embed
      const embed = new EmbedBuilder()
        .setColor("Random")
        .setTimestamp()
        .setTitle("Goodbye")
        .setThumbnail(userAvatar)
        .setFooter({ text: interaction.guild.name })
        .setDescription(messageContent);

      await channel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [embed],
      });
    } else {
      // If the configuration does not specify using an embed
      await channel.send(messageContent); // Sending the goodbye message as a plain text
    }

    await interaction.reply({
      content: `Goodbye message sent successfully! ${channel}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
