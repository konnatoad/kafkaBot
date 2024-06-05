const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
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
      const channelId = interaction.options.getChannel("channel").id; // Getting the channel ID from the interaction options

      const existingSetup = await WelcomeSetup.findOne({ guildId }); // Checking if a welcome setup already exists for the guild
      if (existingSetup) {
        return await interaction.reply({
          // If a setup exists, reply to the interaction with an ephemeral message
          content: "Welcome setup already exists for this server.",
          ephemeral: true,
        });
      }
      await WelcomeSetup.create({
        // If no setup exists, create a new welcome setup
        guildId,
        channelId,
      });
      const embed = new EmbedBuilder()
        .setColor("Random")
        .setDescription(
          `Welcome setup completed. Welcome messages will be sent to <#${channelId}>.`
        )
        .setTimestamp();

      return await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error", error); // Catching and logging any errors
    }
  },
};
