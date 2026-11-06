const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const AutoRole = require("../../../schemas/AutoRole");
const logger = require("../../../extra/logger");
const { whyBotCantGive } = require("../../../utils/roles");

const data = new SlashCommandBuilder()
  .setName("autorole")
  .setDescription("Give new members a role when they join.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("setup")
      .setDescription("Configure your auto-role for this server.")
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("The role you want users to get on join.")
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("disable")
      .setDescription("Disable auto-role in this server."),
  );

const setup = async ({ interaction }) => {
  if (!interaction.inGuild()) {
    return interaction.reply("You can only run this command inside a server.");
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
        ? "Auto role has already been configured for that role. To disable run `/autorole disable`"
        : "Autorole has now been configured. To disable run `/autorole disable`",
    );
  } catch (error) {
    logger.error(
      `autorole setup failed in guild ${interaction.guildId}:`,
      error,
    );
    return interaction.editReply("Couldn't save the auto role, try again.");
  }
};

const disable = async ({ interaction }) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const removed = await AutoRole.findOneAndDelete({
      guildId: interaction.guildId,
    });
    return interaction.editReply(
      removed
        ? "Auto role has been disabled for this server. Use `/autorole setup` to set it up again."
        : "Auto role has not been configured for this server. Use `/autorole setup` to set it up.",
    );
  } catch (error) {
    logger.error(
      `autorole disable failed in guild ${interaction.guildId}:`,
      error,
    );
    return interaction.editReply("Couldn't disable the auto role, try again.");
  }
};

module.exports = { data, subcommands: { setup, disable } };
