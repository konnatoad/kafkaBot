const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getRandomInt(seed, max) {
  return Math.floor(seededRandom(seed) * max);
}

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("kafka")
    .setDescription(
      "Sends random kafka picture. Has to be used in NSWF channel!"
    )
    .setNSFW(true),

  run: async ({ interaction }) => {
    if (!interaction.channel.nsfw)
      return interaction.reply({
        content:
          "This channel is not NSFW and this command cannot be ran here!",
        ephemeral: true,
      });
    let files = fs.readdirSync("src/static/kafka");
    const seed = Date.now() + Math.random();
    let picture = files[getRandomInt(seed, files.length)];
    await interaction.reply({
      files: [`./src/static/kafka/${picture}`],
    });
  },
  testOnly: false,
};
