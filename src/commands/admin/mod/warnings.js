const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { findWarnings } = require("../../../utils/warnings");

// embed descriptions stop at 4096 characters
const MAX_DESCRIPTION = 4000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("This gets the member warnings")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user you want to check the warnings of")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  run: async ({ interaction }) => {
    const target = interaction.options.getUser("user");
    const warnings = await findWarnings(interaction.guildId, target.id);

    if (!warnings.length) {
      const noWarns = new EmbedBuilder()
        .setColor("Blurple")
        .setDescription(`:white_check_mark: **${target}** has **0** warnings!`)
        .setTimestamp();
      return interaction.reply({ embeds: [noWarns] });
    }

    let description = `:exclamation: ${target}'s warnings (${warnings.length}):\n`;
    for (const [i, warning] of warnings.entries()) {
      const line = `\n**${i + 1}.** ${warning.Reason}\n-# by ${warning.ExecuterTag}`;
      if (description.length + line.length > MAX_DESCRIPTION) {
        description += `\n\n…and ${warnings.length - i} more`;
        break;
      }
      description += line;
    }

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: "Warnings", iconURL: "https://vou.s-ul.eu/ts9RQjxl" });
    await interaction.reply({ embeds: [embed] });
  },
};
