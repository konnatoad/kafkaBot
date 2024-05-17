const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const ms = require("ms");

module.exports = {
  deleted: false,

  data: new SlashCommandBuilder()
    .setName("tempban")
    .setDescription("temporarily bans a user")
    .addMentionableOption((option) =>
      option
        .setName("target-user")
        .setDescription("user you want to ban")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setRequired(true)
        .setDescription("Time you want ban user for.")
        .addChoices(
          { name: "30 sec", value: "30s" },
          { name: "30 mins", value: "30m" },
          { name: "1 hour", value: "1h" },
          { name: "2 hours", value: "2h" },
          { name: "3 hours", value: "3h" },
          { name: "5 hours", value: "5h" },
          { name: "10 hours", value: "10h" },
          { name: "1 day", value: "1d" },
          { name: "2 days", value: "2 days" },
          { name: "3 days", value: "3 days" },
          { name: "5 days", value: "5 days" },
          { name: "1 week", value: "1w" },
          { name: "1 month", value: "2629746000" }
        )
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("reason for the ban")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */

  run: async ({ interaction }) => {
    const targetUserId = interaction.options.getUser("target-user");
    const reason =
      interaction.options.get("reason")?.value || "no reason provided";
    const time = interaction.options.getString("time");
    const targetUser = await interaction.guild.members.fetch(targetUserId);

    await interaction.deferReply();

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
      //await interaction.editReply("-");
      //await interaction.deleteReply();
      const banEmbed = new EmbedBuilder()
        .setTitle("**Ban**")
        .setColor("Red")
        .setDescription(`User ${targetUser} was banned.`)
        .addFields(
          {
            name: "Duration:",
            value: `${time}`,
          },
          {
            name: "Reason:",
            value: `${reason}`,
          }
        )
        .setTimestamp()
        .setFooter({
          text: "Temporary ban",
          iconURL: "https://vou.s-ul.eu/ts9RQjxl",
        });

      await interaction.editReply({
        embeds: [banEmbed],
      });
      await targetUser.ban({ reason });

      setTimeout(async () => {
        const unbanembed = new EmbedBuilder()
          .setTitle("**Unban**")
          .setColor("Green")
          .setDescription(`${targetUser} has been unbanned.`)
          .addFields(
            {
              name: "Ban duration:",
              value: `${time}`,
            },
            {
              name: "User was banned with reason:",
              value: `${reason}`,
            }
          )
          .setTimestamp()
          .setFooter({
            text: "Temporary ban",
            iconURL: "https://vou.s-ul.eu/ts9RQjxl",
          });
        await interaction.channel.send({
          embeds: [unbanembed],
        });
        await interaction.guild.members.unban(targetUserId);
      }, ms(time));
    } catch (error) {
      console.log(`there was an error banning ${error}`);
    }
  },
};

//`User ${targetUser} has been unbanned after ${time}.`
//`user ${targetUser} was banned\nreason: ${reason}`
