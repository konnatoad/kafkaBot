const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const levelSchema = require("../../../schemas/level");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("xpuser-reset")
    .setDescription("Resets a members XP")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member you want to clear the xp of")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  run: async ({ interaction }) => {
    const { guildId } = interaction;

    const target = interaction.options.getUser("user");

    const data = await levelSchema.deleteMany({
      Guild: guildId,
      User: target.id,
    });
    const embed = new EmbedBuilder()
      .setColor("DarkPurple")
      .setDescription(`${target.tag}'s xp has been reset!`);

    await interaction.reply({ embeds: [embed] });
  },
};
