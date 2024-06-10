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

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

module.exports = {
  sabiServer: true,
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("cat")
    .setDescription("Locally sourced cat pics."),

  run: async ({ interaction }) => {
    let files = fs.readdirSync("src/static/cat");

    let availableFiles = files.filter((file) => !recentImages.includes(file));

    if (availableFiles.length === 0) {
      recentImages = [];
      availableFiles = files;
    }

    shuffle(availableFiles);

    const seed = Date.now() + Math.random();
    let picture = availableFiles[getRandomInt(seed, availableFiles.length)];

    recentImages.push(picture);

    if (recentImages.length > 10) {
      recentImages.shift();
    }

    await interaction.reply({
      files: [`./src/static/cat/${picture}`],
    });
  },
};
