const { SlashCommandBuilder } = require("discord.js");

// each game's subcommand and lookup lives in src/stats
const GAMES = {
  valorant: require("../../../stats/valorant"),
  tft: require("../../../stats/tft"),
  osu: require("../../../stats/osu"),
};

const data = new SlashCommandBuilder()
  .setName("stats")
  .setDescription("Retrieve game stats from chosen game");
for (const game of Object.values(GAMES)) data.addSubcommand(game.subcommand);

module.exports = {
  data,
  run: ({ interaction }) =>
    GAMES[interaction.options.getSubcommand()].run(interaction),
};
