const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  deleted: false,

  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("bans a user")
    .addMentionableOption((option) =>
      option
        .setName("target-user")
        .setDescription("user you want to ban")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((option) =>
      option.setName("reason").setDescription("reason for the ban")
    ),
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */

  run: async ({ interaction }) => {
    const targetUserId = interaction.options.get("target-user").value;
    const reason =
      interaction.options.get("reason")?.value || "no reason provided";

    await interaction.deferReply();

    const targetUser = await interaction.guild.members.fetch(targetUserId);

    if (!targetUser) {
      await interaction.editReply("that user doesn't exist on this server");
      return;
    }

    if (targetUser.id === interaction.guild.ownerId) {
      await interaction.editReply("you can't ban server owner");
      return;
    }

    const targetUserRolePosition = targetUser.roles.highest.position;
    // const requestUserRolePosition = interaction.member.roles.highest.position;
    const botRolePosition = interaction.guild.members.me.roles.highest.position;

    // if (targetUserRolePosition >= requestUserRolePosition) {
    //     await interaction.editReply("you can't ban a member that has the same or higher role than you");
    //     return;
    // }

    if (targetUserRolePosition >= botRolePosition) {
      await interaction.editReply(
        "i can't ban a member that has the same or higher role than me"
      );
      return;
    }

    try {
      const banEmbed = new EmbedBuilder()
        .setTitle("**Ban**")
        .setColor("Red")
        .setDescription(`User ${targetUser} was banned.`)
        .addFields({
          name: "Reason:",
          value: `${reason}`,
        })
        .setTimestamp()
        .setFooter({
          text: "Perm ban",
          iconURL: "https://vou.s-ul.eu/ts9RQjxl",
        });
      await targetUser.ban({ reason });
      await interaction.editReply({
        embeds: [banEmbed],
      });
    } catch (error) {
      console.log(`there was an error banning ${error}`);
    }
  },
};
