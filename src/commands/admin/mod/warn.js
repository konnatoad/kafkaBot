const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { addWarning } = require("../../../utils/warnings");
const logger = require("../../../extra/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("This warns a server member")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user you want to warn")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the warning")
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  run: async ({ interaction }) => {
    const { options, guildId, user } = interaction;

    const target = options.getUser("user");
    const reason = options.getString("reason") || "No reason given";

    await addWarning({
      guildId,
      userId: target.id,
      userTag: target.username,
      executerId: user.id,
      executerTag: user.username,
      reason,
    });

    const dmEmbed = new EmbedBuilder()
      .setColor("Blurple")
      .setDescription(
        `:exclamation: You have been **warned** in ${interaction.guild.name} | ${reason}`,
      )
      .setTimestamp();
    target.send({ embeds: [dmEmbed] }).catch((err) => {
      if (err.code !== 50007) logger.error("warn: failed to DM user:", err);
    });

    const replyEmbed = new EmbedBuilder()
      .setColor("Blurple")
      .setDescription(
        `:exclamation: **${target}** has been **warned** | ${reason}`,
      )
      .setTimestamp();
    await interaction.reply({ embeds: [replyEmbed] });
  },
};
