const { SlashCommandBuilder } = require("discord.js");
const { videos, easterEggs } = require("../../../../video-urls.json");

let shuffledOptions = [];
let currentIndex = 0;

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildPool(user) {
  const eggs = easterEggs.map((url) =>
    url
      ? `${user} you have found an easter egg!\n${url}`
      : `${user} you have found an easter egg!`
  );
  return [...videos, ...eggs];
}

module.exports = {
  sabiServer: true,
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("video")
    .setDescription("random witchii video"),

  testOnly: false,

  run: async ({ interaction }) => {
    if (shuffledOptions.length === 0 || currentIndex >= shuffledOptions.length) {
      shuffledOptions = shuffleArray(buildPool(interaction.user));
      currentIndex = 0;
    }

    const randomVideo = shuffledOptions[currentIndex];
    currentIndex++;

    await interaction.reply(randomVideo);
  },
};
