const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const warningSchema = require("../../../schemas/warnschema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("This gets the member warnings")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user you want to check the warnings of")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  run: async ({ interaction }) => {
    const { options, guildId, user } = interaction;

    const target = options.getUser("user");

    const userTag = `${target.username}`;

    const embed = new EmbedBuilder();
    const noWarns = new EmbedBuilder();

    let data = await warningSchema.findOne({
      GuildID: guildId,
      UserID: target.id,
      UserNAME: userTag,
    });

    if (data) {
      embed
        .setColor("Blurple")
        .setDescription(
          `:exclamation:     ${target}'s warnings: \n${data.Content.map(
            (w, i) =>
              `
                  **Warning**: ${i + 1}
                  **Warning Moderator**: ${w.ExecuterTag}
                  **Warn Reason**: ${w.Reason}
            `
          ).join(`-`)}`
        )
        .setTimestamp()
        .setFooter({
          text: "Warnings",
          iconURL: "https://vou.s-ul.eu/ts9RQjxl",
        });

      interaction.reply({ embeds: [embed] });
    } else {
      noWarns
        .setColor("Blurple")
        .setDescription(
          `:white_check_mark:     **${target}** has **0** warnings!`
        )
        .setTimestamp();

      interaction.reply({ embeds: [noWarns] });
    }
  },
};
