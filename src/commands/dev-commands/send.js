const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  deleted: false,
  devOnly: true,
  data: new SlashCommandBuilder()
    .setName("toad")
    .setDescription("shhhh")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to send a DM to")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The message to send")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "This command can only be executed inside a server",
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser("target");
    const message = interaction.options.getString("message");

    try {
      await interaction.deferReply({ ephemeral: true });

      try {
        await targetUser.send(message);
        await interaction.editReply({
          content: `Successfully sent a DM to ${targetUser.tag}`,
          ephemeral: true,
        });
      } catch (error) {
        console.error(`Error sending DM: ${error}`);
        await interaction.editReply({
          content: `Failed to send a DM to ${targetUser.tag}`,
          ephemeral: true,
        });
      }
    } catch (error) {
      console.log(`Error handling /senddm: ${error}`);
    }
  },
};
