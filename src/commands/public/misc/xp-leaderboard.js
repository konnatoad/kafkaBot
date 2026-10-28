const { SlashCommandBuilder } = require("discord.js");
const levelSchema = require("../../../schemas/level");
const { replyWithLeaderboard } = require("../../../utils/leaderboard");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("xp-leaderboard")
    .setDescription("This gets a servers xp leaderboard."),

  run: async ({ interaction }) => {
    // XP only ever grows, so the most XP is also the highest level
    const top = await levelSchema
      .find({ Guild: interaction.guildId })
      .sort({ XP: -1 })
      .limit(10);
    return replyWithLeaderboard(interaction, {
      title: `${interaction.guild.name}'s XP Leaderboard:`,
      footer: "XP Leaderboard",
      rows: top.map(({ User, XP, Level }) => ({
        userId: User,
        score: `XP: ${XP} | Level: ${Level}`,
      })),
    });
  },
};
