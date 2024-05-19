const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { startTyping } = require("../../../extra/sendTyping");

module.exports = {
  devOnly: true,
  data: new SlashCommandBuilder()
    .setName("konna")
    .setDescription("no one knows...")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  run: async ({ interaction }) => {
    startTyping(interaction.channel);

    setTimeout(async () => {
      await interaction.channel.send({ content: "kafka supremacy", ephemeral: true });
    }, 2000);
  },
};
