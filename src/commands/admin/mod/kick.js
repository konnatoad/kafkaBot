const logger = require("../../../extra/logger");
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { whyCantModerate } = require("../../../utils/moderation");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("kicks a user")
    .addUserOption((option) =>
      option
        .setName("target-user")
        .setDescription("user you want to kick")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addStringOption((option) =>
      option.setName("reason").setDescription("reason for the kick"),
    ),

  run: async ({ interaction }) => {
    const member = interaction.options.getMember("target-user");
    const reason =
      interaction.options.getString("reason") || "no reason provided";

    await interaction.deferReply();

    if (!member) return interaction.editReply("that user isn't on this server");
    const refusal = whyCantModerate(interaction, member, "kick");
    if (refusal) return interaction.editReply(refusal);

    try {
      await member.kick(reason);
    } catch (error) {
      logger.error(`kick: failed to kick ${member.id}: ${error}`);
      return interaction.editReply(
        `failed to kick ${member}: ${error.message}`,
      );
    }

    const kickEmbed = new EmbedBuilder()
      .setTitle("**Kick**")
      .setColor("Red")
      .setDescription(`User ${member} was kicked.`)
      .addFields({ name: "Reason:", value: reason })
      .setTimestamp()
      .setFooter({ text: "Kick", iconURL: "https://vou.s-ul.eu/ts9RQjxl" });
    await interaction.editReply({ embeds: [kickEmbed] });
  },
};
