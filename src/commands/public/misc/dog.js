const { SlashCommandBuilder } = require("discord.js");
const { pickPicture } = require("../../../utils/pictures");

module.exports = {
  witchOnly: true,
  data: new SlashCommandBuilder()
    .setName("dog")
    .setDescription("Locally sourced dog pics."),

  run: ({ interaction }) => interaction.reply({ files: [pickPicture("dog")] }),
};
