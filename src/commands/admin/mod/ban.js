const logger = require("../../../extra/logger");
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { whyCantModerate } = require("../../../utils/moderation");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("bans a user")
    .addUserOption((option) =>
      option
        .setName("target-user")
        .setDescription("user you want to ban")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((option) =>
      option.setName("reason").setDescription("reason for the ban"),
    ),

  run: async ({ interaction }) => {
    const user = interaction.options.getUser("target-user", true);
    // null when they already left; Discord still lets us ban them by ID
    const member = interaction.options.getMember("target-user");
    const reason =
      interaction.options.getString("reason") || "no reason provided";

    await interaction.deferReply();

    const refusal = member && whyCantModerate(interaction, member, "ban");
    if (refusal) return interaction.editReply(refusal);

    try {
      await interaction.guild.members.ban(user, { reason });
    } catch (error) {
      logger.error(`ban: failed to ban ${user.id}: ${error}`);
      return interaction.editReply(`failed to ban ${user}: ${error.message}`);
    }

    const banEmbed = new EmbedBuilder()
      .setTitle("**Ban**")
      .setColor("Red")
      .setDescription(`User ${user} was banned.`)
      .addFields({ name: "Reason:", value: reason })
      .setTimestamp()
      .setFooter({ text: "Perm ban", iconURL: "https://vou.s-ul.eu/ts9RQjxl" });
    await interaction.editReply({ embeds: [banEmbed] });
  },
};
