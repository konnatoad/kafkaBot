const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const { startTyping } = require("../../extra/sendTyping");

module.exports = {
  devOnly: true,
  data: new SlashCommandBuilder()
    .setName("konna")
    .setDescription("no one knows... | dev only command")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  run: async ({ interaction }) => {
    startTyping(interaction.channel);

    setTimeout(async () => {
      await interaction.channel.send({
        content: "Kafka supremacy",
        flags: MessageFlags.Ephemeral,
      });
    }, 2000);
  },
};
