const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

const WelcomeSetup = require("../../../../schemas/welcomeSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome-setup")
    .setDescription("Setup the welcome message for your server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel where the welcome message will be sent")
        .setRequired(true)
    ),

  run: async ({ interaction }) => {
    try {
      const guildId = interaction.guild.id; // Getting the guild ID from the interaction

      const channel = interaction.options.getChannel("channel");
      const me = interaction.guild.members.me;
      if (!channel.permissionsFor(me)?.has("SendMessages")) {
        return await interaction.reply({
          content: `I don't have permission to send messages in <#${channel.id}>. Please grant me the **Send Messages** permission there first.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const existingSetup = await WelcomeSetup.findOne({ guildId }); // Checking if a welcome setup already exists for the guild
      if (existingSetup) {
        return await interaction.reply({
          // If a setup exists, reply to the interaction with an ephemeral message
          content: "Welcome setup already exists for this server.",
          flags: MessageFlags.Ephemeral,
        });
      }
      await WelcomeSetup.create({
        // If no setup exists, create a new welcome setup
        guildId,
        channelId: channel.id,
      });
      const embed = new EmbedBuilder()
        .setColor("Random")
        .setDescription(
          `Welcome setup completed. Welcome messages will be sent to <#${channel.id}>.`
        )
        .setTimestamp();

      return await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error", error); // Catching and logging any errors
    }
  },
};
