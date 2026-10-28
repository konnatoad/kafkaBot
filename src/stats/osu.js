const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const { Beatmap, Performance } = require("rosu-pp-js");
const logger = require("../extra/logger");
const { getOsuAccessToken } = require("../extra/osuAuth");
const { beatmapText } = require("../utils/osuBeatmaps");

const subcommand = (subcommand) =>
  subcommand
    .setName("osu")
    .setDescription("Get osu! player stats")
    .addStringOption((option) =>
      option
        .setName("player")
        .setDescription("Enter osu! username")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Choose between top or recent plays")
        .setRequired(true)
        .addChoices(
          { name: "Top Plays", value: "top" },
          { name: "Recent Plays", value: "recent" },
        ),
    );

async function run(interaction) {
  const player = interaction.options.getString("player");
  const type = interaction.options.getString("type");

  await interaction.deferReply();

  try {
    const accessToken = await getOsuAccessToken();
    if (!accessToken) {
      return interaction.editReply({
        content: "Failed to retrieve osu! API token.",
      });
    }

    const userResponse = await axios.get(
      `https://osu.ppy.sh/api/v2/users/${encodeURIComponent(player)}/osu`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const user = userResponse.data;
    if (!user || !user.id) {
      return interaction.editReply({
        content: "User not found on osu!",
      });
    }

    let apiUrl = "";
    if (type === "top") {
      apiUrl = `https://osu.ppy.sh/api/v2/users/${user.id}/scores/best?limit=5`;
    } else if (type === "recent") {
      apiUrl = `https://osu.ppy.sh/api/v2/users/${user.id}/scores/recent?limit=1&include_fails=1`;
    } else {
      return interaction.editReply({
        content: "Invalid type. Use `top` or `recent`.",
      });
    }

    const playsResponse = await axios.get(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const plays = playsResponse.data;

    if (!Array.isArray(plays) || plays.length === 0) {
      return interaction.editReply({
        content: `No ${type} plays found for this user.`,
      });
    }

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle(
        `${user.username}'s ${
          type === "top" ? "Top Plays" : "Most Recent Play"
        }`,
      )
      .setThumbnail(user.avatar_url)
      .setURL(`https://osu.ppy.sh/users/${user.id}`)
      .setFooter({ text: "osu! profile", iconURL: user.avatar_url });

    if (type === "top") {
      for (const [index, play] of plays.entries()) {
        const beatmap = play.beatmap;
        const set = play.beatmapset;
        const mods = play.mods.length > 0 ? play.mods.join(", ") : "None";
        const accuracy = (play.accuracy * 100).toFixed(2);
        const rank = play.rank;
        const mapURL = `https://osu.ppy.sh/beatmaps/${beatmap.id}`;
        const officialPp = play.pp ? play.pp.toFixed(2) : "0.00";
        const fieldName = `#${index + 1} - ${set.artist} - ${set.title} [${
          beatmap.version
        }]\n${mapURL}\n`;

        embed.addFields({
          name: fieldName,
          value:
            `▸ **Rank:** ${rank}\n` +
            `▸ **Score:** ${play.score.toLocaleString()}\n` +
            `▸ **Combo:** ${play.max_combo}x\n` +
            `▸ **Mods:** ${mods}\n` +
            `▸ **Accuracy:** ${accuracy}%\n` +
            `▸ **PP:** ${officialPp}\n` +
            `▸ **Hit Counts:** { ${play.statistics.count_300} / ${play.statistics.count_100} / ${play.statistics.count_50} / ${play.statistics.count_miss} }`,
          inline: false,
        });
      }
    } else {
      const play = plays[0];
      const beatmap = play.beatmap;
      const set = play.beatmapset;
      const mods = play.mods.length > 0 ? play.mods.join(", ") : "None";
      const accuracy = (play.accuracy * 100).toFixed(2);
      const rank = play.rank;
      const mapURL = `https://osu.ppy.sh/beatmaps/${beatmap.id}`;

      const osuText = await beatmapText(beatmap.id);
      let ppValue = "N/A";

      if (osuText) {
        const beatmapData = new Beatmap(osuText);
        const performance = new Performance({
          mods: play.mods.join(""),
          combo: play.max_combo,
          n300: play.statistics.count_300,
          n100: play.statistics.count_100,
          n50: play.statistics.count_50,
          misses: play.statistics.count_miss,
          accuracy: play.accuracy * 100,
        });
        ppValue = performance.calculate(beatmapData).pp.toFixed(2);
        // wasm memory: not freed by the garbage collector
        beatmapData.free();
      }

      embed.addFields({
        name: `${set.artist} - ${set.title} [${beatmap.version}]\n${mapURL}\n`,
        value:
          `▸ **Rank:** ${rank}\n` +
          `▸ **Score:** ${play.score.toLocaleString()}\n` +
          `▸ **Combo:** ${play.max_combo}x\n` +
          `▸ **Mods:** ${mods}\n` +
          `▸ **Accuracy:** ${accuracy}%\n` +
          `▸ **PP (est.):** ${ppValue}\n` +
          `▸ **Hit Counts:** { ${play.statistics.count_300} / ${play.statistics.count_100} / ${play.statistics.count_50} / ${play.statistics.count_miss} }`,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(
      "Error retrieving osu! stats:",
      error.response?.data || error.message,
    );
    await interaction.editReply({
      content: "An error occurred while retrieving osu! stats.",
    });
  }
}

module.exports = { subcommand, run };
