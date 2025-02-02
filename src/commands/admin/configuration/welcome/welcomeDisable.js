const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");

const WelcomeSetup = require("../../../../schemas/welcomeSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome-disable")
    .setDescription("Disable the welcome message feature")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  run: async ({ interaction }) => {
    const guildId = interaction.guild.id;
    // Getting the ID of the server
    const deleteSetup = await WelcomeSetup.findOneAndDelete({
      // Deleting the welcome message configuration for the server
      guildId: guildId,
    });
    if (!deleteSetup) {
      return await interaction.reply({
        content: "Welcome setup not found",
        flags: MessageFlags.Ephemeral,
      });
    }
    await interaction.reply({
      content: "Welcome setup has been disabled.",
    });
  },
};
