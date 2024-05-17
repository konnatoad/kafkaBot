const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("kafka")
    .setDescription("Sends random kafka picture."),

  run: async ({ interaction }) => {
    let files = fs.readdirSync("src/static/kafka");
    let picture = files[Math.floor(Math.random() * files.length)];
    await interaction.reply({
      files: [`./src/static/kafka/${picture}`],
    });
  },
  testOnly: true,
};
