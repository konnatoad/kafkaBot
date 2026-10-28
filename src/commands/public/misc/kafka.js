const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { pickPicture } = require("../../../utils/pictures");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kafka")
    .setDescription(
      "Sends random kafka picture. Has to be used in NSWF channel!",
    )
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
