const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const GoodbyeSetup = require("../../../../schemas/goodbyeSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("goodbye-disable")
    .setDescription("Disable the goodbye message feature")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  run: async ({ interaction }) => {
    const guildId = interaction.guild.id;
    // Getting the ID of the server
    const deleteSetup = await GoodbyeSetup.findOneAndDelete({
      // Deleting the goodbye message configuration for the server
      guildId: guildId,
    });
    if (!deleteSetup) {
      return await interaction.reply({
        content: "goodbye setup not found",
        ephemeral: true,
      });
    }
    await interaction.reply({
      content: "goodbye setup has been disabled.",
    });
  },
};
