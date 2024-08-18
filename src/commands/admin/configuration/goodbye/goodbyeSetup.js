const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");

const GoodbyeSetup = require("../../../../schemas/goodbyeSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("goodbye-setup")
    .setDescription("Setup the goodbye message for your server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel where the goodbye message will be sent")
        .setRequired(true)
    ),

  run: async ({ interaction }) => {
    try {
      const guildId = interaction.guild.id; // Getting the guild ID from the interaction
      const channelId = interaction.options.getChannel("channel").id; // Getting the channel ID from the interaction options

      const existingSetup = await GoodbyeSetup.findOne({ guildId }); // Checking if a goodbye setup already exists for the guild
      if (existingSetup) {
        return await interaction.reply({
          // If a setup exists, reply to the interaction with an ephemeral message
          content: "goodbye setup already exists for this server.",
          ephemeral: true,
        });
      }
      await GoodbyeSetup.create({
        // If no setup exists, create a new goodbye setup
        guildId,
        channelId,
      });
      const embed = new EmbedBuilder()
        .setColor("Random")
        .setDescription(
          `Goodbye setup completed. Goodbye messages will be sent to <#${channelId}>.`
        )
        .setTimestamp();

      return await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error", error); // Catching and logging any errors
    }
  },
};
