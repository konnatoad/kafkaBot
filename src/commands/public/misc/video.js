const { SlashCommandBuilder } = require("discord.js");
const { videos, easterEggs } = require("../../../../video-urls.json");
const { shuffle } = require("../../../utils/random");

let shuffledOptions = [];
let currentIndex = 0;

function buildPool(user) {
  const eggs = easterEggs.map((url) =>
    url
      ? `${user} you have found an easter egg!\n${url}`
      : `${user} you have found an easter egg!`,
  );
  return [...videos, ...eggs];
}

module.exports = {
  witchOnly: true,
  data: new SlashCommandBuilder()
    .setName("video")
    .setDescription("random witchii video"),

  run: async ({ interaction }) => {
    if (
      shuffledOptions.length === 0 ||
      currentIndex >= shuffledOptions.length
    ) {
      shuffledOptions = shuffle(buildPool(interaction.user));
      currentIndex = 0;
    }

    const randomVideo = shuffledOptions[currentIndex];
    currentIndex++;

    await interaction.reply(randomVideo);
  },
};
