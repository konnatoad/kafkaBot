const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { addWarning } = require("../../../utils/addWarning");
const logger = require("../../../extra/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("This warns a server member")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user you want to warn")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the warning")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  run: async ({ interaction }) => {
    const { options, guildId, user } = interaction;

    const target = options.getUser("user");
    const reason = options.getString("reason") || "No reason given";

    const userTag = `${target.username}`;

    await addWarning({
      guildId,
      userId: target.id,
      userTag,
      executerId: user.id,
      executerTag: user.username,
      reason,
    });

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setDescription(
        `:exclamation:      You have been **warned** in ${interaction.guild.name} | ${reason}`
      )
      .setTimestamp();

    const embed2 = new EmbedBuilder()
      .setColor("Blurple")
      .setDescription(
        `:exclamation:      **${target}** has been ** warned** | ${reason}`
      )
      .setTimestamp();

    target.send({ embeds: [embed] }).catch((err) => {
      if (err.code !== 50007) logger.error("warn: failed to DM user:", err);
    });

    interaction.reply({ embeds: [embed2] });
  },
};
