const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getRandomInt(seed, max) {
  return Math.floor(seededRandom(seed) * max);
}

module.exports = {
  deleted: true,
  data: new SlashCommandBuilder()
    .setName("rice")
    .setDescription("test command for testserver only")
    .setNSFW(true)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  run: async ({ interaction }) => {
    if (!interaction.channel.nsfw)
      return interaction.reply(
        "This channel is not NSFW and this command cannot be ran here!"
      );
    let files = fs.readdirSync("src/static/ricegnat");
    const seed = Date.now() + Math.random();
    let picture = files[getRandomInt(seed, files.length)];
    await interaction.reply({
      files: [`./src/static/ricegnat/${picture}`],
    });
  },
  devOnly: false,
  testOnly: true,
};
