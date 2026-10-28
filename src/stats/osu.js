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

const API = "https://osu.ppy.sh/api/v2";

async function osuGet(path, token) {
  const { data } = await axios.get(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

/** pp for a play from its beatmap, or "N/A" when the map can't be had */
async function estimatePp(play) {
  const osuText = await beatmapText(play.beatmap.id);
  if (!osuText) return "N/A";
  const beatmap = new Beatmap(osuText);
  try {
    return new Performance({
      mods: play.mods.join(""),
      combo: play.max_combo,
      n300: play.statistics.count_300,
      n100: play.statistics.count_100,
      n50: play.statistics.count_50,
      misses: play.statistics.count_miss,
      accuracy: play.accuracy * 100,
    })
      .calculate(beatmap)
      .pp.toFixed(2);
  } finally {
    // wasm memory: not freed by the garbage collector
    beatmap.free();
  }
}

function playField(play, heading, ppLine) {
  const { beatmap, beatmapset: set, statistics: hits } = play;
  return {
    name: `${heading}${set.artist} - ${set.title} [${beatmap.version}]\nhttps://osu.ppy.sh/beatmaps/${beatmap.id}\n`,
    value: [
      `▸ **Rank:** ${play.rank}`,
      `▸ **Score:** ${play.score.toLocaleString()}`,
      `▸ **Combo:** ${play.max_combo}x`,
      `▸ **Mods:** ${play.mods.length ? play.mods.join(", ") : "None"}`,
      `▸ **Accuracy:** ${(play.accuracy * 100).toFixed(2)}%`,
      ppLine,
      `▸ **Hit Counts:** { ${hits.count_300} / ${hits.count_100} / ${hits.count_50} / ${hits.count_miss} }`,
    ].join("\n"),
  };
}

async function run(interaction) {
  const player = interaction.options.getString("player");
  const type = interaction.options.getString("type");
  await interaction.deferReply();

  try {
    const token = await getOsuAccessToken();
    if (!token)
      return interaction.editReply("Failed to retrieve osu! API token.");

    let user;
    try {
      user = await osuGet(`/users/${encodeURIComponent(player)}/osu`, token);
    } catch (error) {
      // osu! answers an unknown name with a 404
      if (error.response?.status === 404) {
        return interaction.editReply("User not found on osu!");
      }
      throw error;
    }

    const plays = await osuGet(
      type === "top"
        ? `/users/${user.id}/scores/best?limit=5`
        : `/users/${user.id}/scores/recent?limit=1&include_fails=1`,
      token,
    );
    if (!plays.length) {
      return interaction.editReply(`No ${type} plays found for this user.`);
    }

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle(
        `${user.username}'s ${type === "top" ? "Top Plays" : "Most Recent Play"}`,
      )
      .setThumbnail(user.avatar_url)
      .setURL(`https://osu.ppy.sh/users/${user.id}`)
      .setFooter({ text: "osu! profile", iconURL: user.avatar_url });

    if (type === "top") {
      embed.addFields(
        plays.map((play, i) =>
          playField(
            play,
            `#${i + 1} - `,
            `▸ **PP:** ${play.pp ? play.pp.toFixed(2) : "0.00"}`,
          ),
        ),
      );
    } else {
      // recent plays have no pp from osu!, so it's worked out from the map
      const [play] = plays;
      embed.addFields(
        playField(play, "", `▸ **PP (est.):** ${await estimatePp(play)}`),
      );
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error("Error retrieving osu! stats:", error.response?.data ?? error);
    await interaction.editReply(
      "An error occurred while retrieving osu! stats.",
    );
  }
}

module.exports = { subcommand, run };
