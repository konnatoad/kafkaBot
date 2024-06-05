const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const WelcomeSetup = require("../../../../schemas/welcomeSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome-message")
    .setDescription("Set the welcome message for new members")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription(
          "Variables {SERVER_MEMBER}, {SERVER_NAME}, {USER_MENTION}, {USER_NAME}"
        )
        .setRequired(true)
    )
    // Add a boolean option for using an embed for the welcome message
    .addBooleanOption((option) =>
      option
        .setName("use_embed")
        .setDescription("Use an embed for the welcome message")
        .setRequired(false)
    ),
  run: async ({ interaction }) => {
    // Get the welcome message and use embed option from the interaction
    const welcomeMessage = interaction.options.getString("message");
    const useEmbed = interaction.options.getBoolean("use_embed") || false;
    const guildId = interaction.guild.id;

    // Check if a welcome setup exists for the guild
    let existingSetup = await WelcomeSetup.findOne({ guildId });
    if (!existingSetup) {
      // If no setup exists, reply with an error message
      return await interaction.reply({
        content:
          "Please setup the welcome system first using `/welcome-setup`.",
        ephemeral: true,
      });
    }
    // Update the welcome setup with the new message and use embed option
    existingSetup.welcomeMessage = welcomeMessage;
    existingSetup.useEmbed = useEmbed;
    await existingSetup.save();
    // Reply with a success message
    await interaction.reply({
      content: "Custom welcome message set succesfully.",
      ephemeral: true,
    });
  },
};
