const {
  Client,
  Interaction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  MessageFlags,
} = require("discord.js");
const AutoRole = require("../../../../schemas/AutoRole");

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  run: async ({ client, interaction }) => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (!(await AutoRole.exists({ guildId: interaction.guild.id }))) {
        interaction.editReply(
          "Auto role has not been configured for this server. Use `/autorole-configure` to set it up."
        );
        return;
      }

      await AutoRole.findOneAndDelete({ guildId: interaction.guild.id });
      interaction.editReply(
        "Auto role has been disabled for this server. Use `/autorole-configure` to set it up again."
      );
    } catch (error) {
      console.error(error);
    }
  },

  data: new SlashCommandBuilder()
    .setName("autorole-disable")
    .setDescription("Disable auto-role in this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
};
