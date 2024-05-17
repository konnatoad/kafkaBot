const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

module.exports = {
  sabiServer: true,
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("cat")
    .setDescription("Locally sourced cat pics."),

  run: async ({ interaction }) => {
    let files = fs.readdirSync("src/static/cat");
    let picture = files[Math.floor(Math.random() * files.length)];
    await interaction.reply({
      files: [`./src/static/cat/${picture}`],
    });
  },
};
