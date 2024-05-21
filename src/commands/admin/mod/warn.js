const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const warningSchema = require("../../../schemas/warnschema");

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

    let data = await warningSchema.findOne({
      GuildID: guildId,
      UserID: target.id,
      UserNAME: userTag,
    });

    if (!data) {
      data = new warningSchema({
        GuildID: guildId,
        UserID: target.id,
        UserNAME: userTag,
        Content: [
          {
            ExecuterId: user.id,
            ExecuterTag: user.username,
            Reason: reason,
          },
        ],
      });
    } else {
      const warnContent = {
        ExecuterId: user.id,
        ExecuterTag: user.username,
        Reason: reason,
      };
      data.Content.push(warnContent);
    }
    data.save();

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
      return;
    });

    interaction.reply({ embeds: [embed2] });
  },
};
