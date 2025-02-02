const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const warningSchema = require("../../../schemas/warnschema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearwarn")
    .setDescription("This clears a members warnings")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user you want to clear the warnings of")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  run: async ({ interaction }) => {
    const { options, guildId, user } = interaction;

    const target = options.getUser("user");
    const userTag = `${target.username}`;

    const embed = new EmbedBuilder();

    let data = await warningSchema.findOne({
      GuildID: guildId,
      UserID: target.id,
      UserNAME: userTag,
    });

    if (data) {
      await warningSchema.findOneAndDelete({
        GuildID: guildId,
        UserID: target.id,
        UserNAME: userTag,
      });

      embed
        .setColor("Blurple")
        .setDescription(
          `:white_check_mark:   **${target}'s** warnings have been cleared`
        )
        .setTimestamp();

      interaction.reply({ embeds: [embed] });
    } else {
      interaction.reply({
        content: `**${target}** has no warnings to be cleared`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
