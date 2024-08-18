const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const GoodbyeSetup = require("../../../../schemas/goodbyeSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("goodbye-message")
    .setDescription("Set the goodbye message for new members")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription(
          "Variables {SERVER_MEMBER}, {SERVER_NAME}, {USER_MENTION}, {USER_NAME}"
        )
        .setRequired(true)
    )
    // Add a boolean option for using an embed for the goodbye message
    .addBooleanOption((option) =>
      option
        .setName("use_embed")
        .setDescription("Use an embed for the goodbye message")
        .setRequired(false)
    ),
  run: async ({ interaction }) => {
    // Get the goodbye message and use embed option from the interaction
    const goodbyeMessage = interaction.options.getString("message");
    const useEmbed = interaction.options.getBoolean("use_embed") || false;
    const guildId = interaction.guild.id;

    // Check if a goodbye setup exists for the guild
    let existingSetup = await GoodbyeSetup.findOne({ guildId });
    if (!existingSetup) {
      // If no setup exists, reply with an error message
      return await interaction.reply({
        content:
          "Please setup the goodbye system first using `/goodbye-setup`.",
        ephemeral: true,
      });
    }
    // Update the goodbye setup with the new message and use embed option
    existingSetup.goodbyeMessage = goodbyeMessage;
    existingSetup.useEmbed = useEmbed;
    await existingSetup.save();
    // Reply with a success message
    await interaction.reply({
      content: "Custom goodbye message set succesfully.",
      ephemeral: true,
    });
  },
};
