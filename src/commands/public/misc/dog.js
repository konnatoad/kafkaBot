const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

module.exports = {
  sabiServer: true,
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("dog")
    .setDescription("Locally sourced dog pics."),

  run: async ({ interaction }) => {
    let files = fs.readdirSync("src/static/dog");
    let picture = files[Math.floor(Math.random() * files.length)];
    await interaction.reply({
      files: [`./src/static/dog/${picture}`],
    });
  },
};
