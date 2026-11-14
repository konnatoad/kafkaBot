const { SlashCommandBuilder } = require("discord.js");
const { pickPicture } = require("../../../utils/pictures");
const { videos, easterEggs } = require("../../../../video-urls.json");
const { shuffle } = require("../../../utils/random");

const data = new SlashCommandBuilder()
  .setName("random")
  .setDescription("A random cat, dog or witchii video")
  .addSubcommand((subcommand) =>
    subcommand.setName("cat").setDescription("Locally sourced cat pics."),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("dog").setDescription("Locally sourced dog pics."),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("video").setDescription("random witchii video"),
  );

const cat = ({ interaction }) =>
  interaction.reply({ files: [pickPicture("cat")] });

const dog = ({ interaction }) =>
  interaction.reply({ files: [pickPicture("dog")] });

// every video and easter egg plays once before any of them repeats
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

const video = async ({ interaction }) => {
  if (shuffledOptions.length === 0 || currentIndex >= shuffledOptions.length) {
    shuffledOptions = shuffle(buildPool(interaction.user));
    currentIndex = 0;
  }

  const randomVideo = shuffledOptions[currentIndex];
  currentIndex++;

  await interaction.reply(randomVideo);
};

module.exports = {
  // all three only run in witchServers (validations/witchonly.js)
  witchOnly: true,
  data,
  subcommands: { cat, dog, video },
};
