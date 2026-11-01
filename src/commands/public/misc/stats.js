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

const subcommands = {};
for (const [name, game] of Object.entries(GAMES))
  subcommands[name] = ({ interaction }) => game.run(interaction);

module.exports = { data, subcommands };
