const { SlashCommandBuilder } = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");
const { replyWithLeaderboard } = require("../../../utils/leaderboard");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ricetop")
    .setDescription("This gets a servers rice grain leaderboard."),

  run: async ({ interaction }) => {
    const top = await UserProfile.find({ Guild: interaction.guildId })
      .sort({ balance: -1 })
      .limit(10);
    return replyWithLeaderboard(interaction, {
      title: `${interaction.guild.name}'s wealth leaderboard:`,
      footer: "Wealth Leaderboard",
      rows: top.map(({ userId, balance }) => ({
        userId,
        score: `rice grains: ${balance}`,
      })),
    });
  },
};
