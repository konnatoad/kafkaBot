const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { pickPicture } = require("../../../utils/pictures");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kafka")
    .setDescription("a random Kafka picture (NSFW channels only)")
    .setNSFW(true),

  run: async ({ interaction }) => {
    if (!interaction.channel?.nsfw)
      return interaction.reply({
        content:
          "This channel is not NSFW and this command cannot be ran here!",
        flags: MessageFlags.Ephemeral,
      });
    await interaction.reply({ files: [pickPicture("kafka")] });
  },
};
