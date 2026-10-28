const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const AutoRole = require("../../../../schemas/AutoRole");
const logger = require("../../../../extra/logger");
const { whyBotCantGive } = require("../../../../utils/roles");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autorole-configure")
    .setDescription("Configure your auto-role for this server.")
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("The role you want users to get on join.")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      return interaction.reply(
        "You can only run this command inside a server.",
      );
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const role = interaction.options.getRole("role", true);
    const refusal = whyBotCantGive(interaction.guild, role);
    if (refusal) return interaction.editReply(refusal);

    try {
      const before = await AutoRole.findOneAndUpdate(
        { guildId: interaction.guildId },
        { roleId: role.id },
        { upsert: true },
      );
      return interaction.editReply(
        before?.roleId === role.id
          ? "Auto role has already been configured for that role. To disable run `/autorole-disable`"
          : "Autorole has now been configured. To disable run `/autorole-disable`",
      );
    } catch (error) {
      logger.error(
        `autorole-configure failed in guild ${interaction.guildId}:`,
        error,
      );
      return interaction.editReply("Couldn't save the auto role, try again.");
    }
  },
};
