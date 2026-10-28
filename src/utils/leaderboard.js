const { EmbedBuilder } = require("discord.js");

/**
 * Replies with a top-10 board. `rows` are [{ userId, score }] in order; a user
 * whose account is gone shows as their id instead of failing the whole board.
 */
async function replyWithLeaderboard(interaction, { title, footer, rows }) {
  if (!rows.length) {
    const empty = new EmbedBuilder()
      .setColor("Blurple")
      .setDescription("No one is on the leaderboard yet...");
    return interaction.reply({ embeds: [empty] });
  }

  await interaction.deferReply();
  const names = await Promise.all(
    rows.map(({ userId }) =>
      interaction.client.users
        .fetch(userId)
        .then((user) => user.tag)
        .catch(() => userId),
    ),
  );
  const lines = rows.map((row, i) => `${i + 1}. ${names[i]} | ${row.score}`);

  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle(title)
    .setDescription(`\`\`\`${lines.join("\n")}\`\`\``)
    .setTimestamp()
    .setFooter({ text: footer, iconURL: "https://vou.s-ul.eu/ts9RQjxl" });
  return interaction.editReply({ embeds: [embed] });
}

module.exports = { replyWithLeaderboard };
