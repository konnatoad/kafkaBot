const { SlashCommandBuilder } = require("discord.js");
const { pickPicture } = require("../../../utils/pictures");

module.exports = {
  witchOnly: true,
  data: new SlashCommandBuilder()
    .setName("cat")
    .setDescription("Locally sourced cat pics."),

  run: ({ interaction }) => interaction.reply({ files: [pickPicture("cat")] }),
};
