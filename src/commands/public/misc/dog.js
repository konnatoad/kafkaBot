const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

let recentImages = [];

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getRandomInt(seed, max) {
  return Math.floor(seededRandom(seed) * max);
}

module.exports = {
  sabiServer: true,
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("dog")
    .setDescription("Locally sourced dog pics."),

  run: async ({ interaction }) => {
    let files = fs.readdirSync("src/static/dog");

    let availableFiles = files.filter((file) => !recentImages.includes(file));

    if (availableFiles.length === 0) {
      recentImages = [];
      availableFiles = files;
    }

    const seed = Date.now() + Math.random();
    let picture = availableFiles[getRandomInt(seed, availableFiles.length)];

    recentImages.push(picture);

    if (recentImages.length > 10) {
      recentImages.shift();
    }

    await interaction.reply({
      files: [`./src/static/dog/${picture}`],
    });
  },
};
