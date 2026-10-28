const {
  PermissionFlagsBits,
  SlashCommandBuilder,
  MessageFlags,
} = require("discord.js");
const AutoRole = require("../../../../schemas/AutoRole");
const logger = require("../../../../extra/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autorole-disable")
    .setDescription("Disable auto-role in this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  run: async ({ interaction }) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const removed = await AutoRole.findOneAndDelete({
        guildId: interaction.guildId,
      });
      return interaction.editReply(
        removed
          ? "Auto role has been disabled for this server. Use `/autorole-configure` to set it up again."
          : "Auto role has not been configured for this server. Use `/autorole-configure` to set it up.",
      );
    } catch (error) {
      logger.error(
        `autorole-disable failed in guild ${interaction.guildId}:`,
        error,
      );
      return interaction.editReply(
        "Couldn't disable the auto role, try again.",
      );
    }
  },
};
