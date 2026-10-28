const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const { clearWarnings } = require("../../../utils/warnings");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearwarn")
    .setDescription("This clears a members warnings")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user you want to clear the warnings of")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  run: async ({ interaction }) => {
    const target = interaction.options.getUser("user");
    const cleared = await clearWarnings(interaction.guildId, target.id);

    if (!cleared) {
      return interaction.reply({
        content: `**${target}** has no warnings to be cleared`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setDescription(
        `:white_check_mark: **${target}'s** ${cleared} warning(s) have been cleared`,
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
