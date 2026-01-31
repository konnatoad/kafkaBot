const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const axios = require("axios");
const { getOsuAccessToken } = require("../../../extra/osuAuth");
require("dotenv").config();
const { Beatmap, Performance } = require("rosu-pp-js");
const fs = require("fs");
const path = require("path");

const VAL_CACHE = new Map(); // key -> { expires, payload }
const VAL_CACHE_TTL_MS = 30_000;

function fmtNum(n) {
  if (n === null || n === undefined) return "N/A";
  const num = Number(n);
  return Number.isFinite(num) ? num.toLocaleString() : String(n);
}

function fmtDelta(n) {
  if (n === null || n === undefined) return "N/A";
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);

  const arrow = num > 0 ? "▲" : num < 0 ? "▼" : "▬";
  const sign = num > 0 ? "+" : "";
  return `${arrow} ${sign}${num}`;
}

function pct(x) {
  const num = Number(x);
  if (!Number.isFinite(num)) return "N/A";
  return `${(num * 100).toFixed(1)}%`;
}

function safeRiotIdSplit(input) {
  const raw = String(input || "").trim();
  const idx = raw.lastIndexOf("#");
  if (idx === -1) return { name: null, tag: null };
  const name = raw.slice(0, idx).trim();
  const tag = raw.slice(idx + 1).trim();
  return { name: name || null, tag: tag || null };
}

function padRight(str, n) {
  str = String(str ?? "");
  return str.length >= n ? str : str + " ".repeat(n - str.length);
}

function mkHeadline({ currentRank, rr, lastChange, elo }) {
  const parts = [];
  parts.push(`**${currentRank || "Unrated"}**`);
  if (rr != null) parts.push(`**${rr} RR**`);
  if (lastChange != null) parts.push(`Last **${fmtDelta(lastChange)} RR**`);
  if (elo != null && Number(elo) !== 0) parts.push(`Elo **${fmtNum(elo)}**`);
  return parts.join(" • ");
}

function mkOverviewBlock({
  region,
  platform,
  accountLevel,
  peakText,
  seasonalGames,
  seasonalWins,
  seasonalWinrate
}) {
  const L = 10;
  const lines = [
    `${padRight("Region", L)}: ${String(region).toUpperCase()}`,
    `${padRight("Platform", L)}: ${String(platform).toUpperCase()}`,
    `${padRight("Level", L)}: ${fmtNum(accountLevel)}`,
    `${padRight("Peak", L)}: ${peakText || "N/A"}`,
    `${padRight("Games", L)}: ${fmtNum(seasonalGames)}`,
    `${padRight("Wins", L)}: ${fmtNum(seasonalWins)} (${seasonalWinrate})`
  ];
  return "```txt\n" + lines.join("\n") + "\n```";
}

function mkActsBlock(seasonal) {
  if (!Array.isArray(seasonal) || seasonal.length === 0) {
    return "```txt\nNo competitive history available.\n```";
  }

  const lastActs = seasonal.slice(-3).reverse();
  const lines = lastActs.map((s) => {
    const act = s.season?.short ? String(s.season.short).toUpperCase() : "UNK";
    const tier = s.end_tier?.name || "Unrated";
    const rr = s.end_rr != null ? `${s.end_rr}RR` : "—";
    const wins = Number(s.wins || 0);
    const games = Number(s.games || 0);
    const losses = Math.max(0, games - wins);
    const wr = games > 0 ? pct(wins / games) : "N/A";

    return `${padRight(act, 6)} ${padRight(tier, 14)} ${padRight(
      rr,
      6
    )} ${padRight(`${wins}W-${losses}L`, 7)} ${wr}`;
  });

  return "```txt\n" + lines.join("\n") + "\n```";
}

async function downloadBeatmap(beatmapId, beatmapPath) {
  if (!fs.existsSync(beatmapPath)) {
    console.log(`Downloading beatmap: ${beatmapId}`);
    try {
      const beatmapResponse = await axios.get(
        `https://osu.ppy.sh/osu/${beatmapId}`,
        {
          responseType: "arraybuffer"
        }
      );

      fs.writeFileSync(beatmapPath, beatmapResponse.data);

      const fileSize = fs.statSync(beatmapPath).size;
      if (fileSize === 0) {
        console.error(`Downloaded beatmap ${beatmapId} is empty!`);
        return false;
      }
    } catch (error) {
      console.error(`Failed to download beatmap ${beatmapId}:`, error);
      return false;
    }
  }
  return true;
}

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Retrieve game stats from chosen game")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("valorant")
        .setDescription("Get valorant player stats")
        .addStringOption((option) =>
          option
            .setName("player")
            .setDescription("Enter the Riot ID (e.g., Player#1234)")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("region")
            .setDescription("Player region (Default EU)")
            .addChoices(
              { name: "Europe", value: "eu" },
              { name: "North America", value: "na" },
              { name: "LATAM", value: "latam" },
              { name: "Brazil", value: "br" },
              { name: "APAC", value: "ap" },
              { name: "Korea", value: "kr" }
            )
        )
        .addStringOption((option) =>
          option
            .setName("platform")
            .setDescription("Platform (Default PC)")
            .addChoices(
              { name: "PC", value: "pc" },
              { name: "Console", value: "console" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tft")
        .setDescription("Get TFT player stats")
        .addStringOption((option) =>
          option
            .setName("player")
            .setDescription("Enter the Riot ID (e.g., Player#1234)")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("region")
            .setDescription("Player region (Default EUW)")
            .addChoices(
              { name: "Europe West (EUW)", value: "euw1" },
              { name: "Europe Nordic & East (EUNE)", value: "eun1" },
              { name: "North America (NA)", value: "na1" },
              { name: "Brazil (BR)", value: "br1" },
              { name: "Latin America North (LAN)", value: "la1" },
              { name: "Latin America South (LAS)", value: "la2" },
              { name: "Korea (KR)", value: "kr" },
              { name: "Japan (JP)", value: "jp1" },
              { name: "Oceania (OCE)", value: "oc1" },
              { name: "Russia (RU)", value: "ru" },
              { name: "Turkey (TR)", value: "tr1" },
              { name: "Thailand (TH)", value: "sg2" },
              { name: "Singapore (SG)", value: "sg2" },
              { name: "Philippines (PH)", value: "sg2" },
              { name: "Vietnam (VN)", value: "vn2" },
              { name: "Taiwan (TW)", value: "tw2" },
              { name: "Indonesia (ID)", value: "id2" }
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("osu")
        .setDescription("Get osu! player stats")
        .addStringOption((option) =>
          option
            .setName("player")
            .setDescription("Enter osu! username")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Choose between top or recent plays")
            .setRequired(true)
            .addChoices(
              { name: "Top Plays", value: "top" },
              { name: "Recent Plays", value: "recent" }
            )
        )
    ),

  async run({ interaction }) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "valorant") {
      const player = interaction.options.getString("player");
      const region = interaction.options.getString("region") || "eu";
      const platform = interaction.options.getString("platform") || "pc";

      await interaction.deferReply();

      const { name, tag } = safeRiotIdSplit(player);
      if (!name || !tag) {
        return interaction.editReply({
          content:
            "Invalid Riot ID format. Use `Player#Tag` (example: `TenZ#NA1`).",
          ephemeral: true
        });
      }

      const cacheKey = `${region}:${platform}:${name.toLowerCase()}#${tag.toLowerCase()}`;
      const cached = VAL_CACHE.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return interaction.editReply(cached.payload);
      }

      const headers = {
        Authorization: process.env.VALORANT,
        "User-Agent": "KafkaBot/1.0"
      };

      try {
        // 1) Account (v1)
        let accountData = null;
        try {
          const accountRes = await axios.get(
            `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(
              name
            )}/${encodeURIComponent(tag)}`,
            { headers }
          );
          accountData = accountRes.data?.data;
        } catch (err) {
          if (err.response?.data?.errors?.some((e) => e.code === 24)) {
            return interaction.editReply({
              content: "No Data",
              ephemeral: true
            });
          }

          console.error(
            "Valorant account error:",
            err.response?.data || err.message
          );
          return interaction.editReply({
            content:
              "Couldn’t fetch account info. Check the Riot ID and try again.",
            ephemeral: true
          });
        }

        // 2) MMR (v3)
        let mmrData = null;
        try {
          const mmrRes = await axios.get(
            `https://api.henrikdev.xyz/valorant/v3/mmr/${region}/${platform}/${encodeURIComponent(
              name
            )}/${encodeURIComponent(tag)}`,
            { headers }
          );
          mmrData = mmrRes.data?.data;
        } catch (err) {
          console.warn(
            "Valorant MMR v3 error (continuing):",
            err.response?.data || err.message
          );
        }

        const riotId = `${accountData?.name ?? name}#${
          accountData?.tag ?? tag
        }`;
        const accountLevel = accountData?.account_level ?? "N/A";
        const playerCard = accountData?.card?.small || null;

        const currentRank = mmrData?.current?.tier?.name || "Unrated";
        const rr = mmrData?.current?.rr ?? null;
        const elo = mmrData?.current?.elo ?? null;
        const lastChange = mmrData?.current?.last_change ?? null;

        const peakTier = mmrData?.peak?.tier?.name || null;
        const peakSeason = mmrData?.peak?.season?.short || null;
        const peakRr = mmrData?.peak?.rr ?? null;

        const peakText = peakTier
          ? `${peakTier}${
              peakSeason ? ` (${String(peakSeason).toUpperCase()})` : ""
            }${peakRr != null ? ` • ${peakRr} RR` : ""}`
          : "N/A";

        const seasonal = Array.isArray(mmrData?.seasonal)
          ? mmrData.seasonal
          : [];

        // totals
        let seasonalGames = 0;
        let seasonalWins = 0;
        let seasonalWinrate = "N/A";

        if (seasonal.length) {
          for (const s of seasonal) {
            seasonalGames += Number(s.games || 0);
            seasonalWins += Number(s.wins || 0);
          }
          seasonalWinrate =
            seasonalGames > 0 ? pct(seasonalWins / seasonalGames) : "N/A";
        }

        const headline = mkHeadline({ currentRank, rr, lastChange, elo });
        const overview = mkOverviewBlock({
          region,
          platform,
          accountLevel,
          peakText,
          seasonalGames,
          seasonalWins,
          seasonalWinrate
        });
        const acts = mkActsBlock(seasonal);

        const trackerUrl = `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(
          riotId
        )}/overview`;

        const embed = new EmbedBuilder()
          .setColor("Blurple")
          .setAuthor({
            name: `${riotId} — Valorant`,
            iconURL: playerCard || undefined
          })
          .setURL(trackerUrl)
          .setDescription(headline)
          .setThumbnail(playerCard || null)
          .addFields(
            { name: "Overview", value: overview, inline: false },
            { name: "Recent Acts", value: acts, inline: false }
          )
          .setFooter({
            text: "git gud uwu",
            iconURL: "https://cdn3.emoji.gg/emojis/5007-uwu.png"
          })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Tracker.gg")
            .setStyle(ButtonStyle.Link)
            .setURL(trackerUrl)
        );

        const payload = { embeds: [embed], components: [row] };

        VAL_CACHE.set(cacheKey, {
          expires: Date.now() + VAL_CACHE_TTL_MS,
          payload
        });

        return interaction.editReply(payload);
      } catch (error) {
        console.error(
          "Error fetching Valorant stats:",
          error.response?.data || error.message
        );
        return interaction.editReply({
          content:
            "An error occurred while retrieving Valorant stats. Try again in a bit.",
          ephemeral: true
        });
      }
    }
    if (subcommand === "tft") {
      const player = interaction.options.getString("player");
      const region = interaction.options.getString("region");

      await interaction.deferReply();

      const { name, tag } = safeRiotIdSplit(player);
      if (!name || !tag) {
        return interaction.editReply({
          content: "Invalid Riot ID format. Use `Player#Tag`.",
          ephemeral: true
        });
      }

      try {
        const riotAccountResponse = await axios.get(
          `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
            name
          )}/${encodeURIComponent(tag)}`,
          {
            headers: { "X-Riot-Token": process.env.RIOT_API }
          }
        );
        const puuid = riotAccountResponse.data.puuid;

        const regionMapping = {
          br1: "br1",
          eun1: "eun1",
          euw1: "euw1",
          jp1: "jp1",
          kr: "kr",
          la1: "la1",
          la2: "la2",
          na1: "na1",
          oc1: "oc1",
          tr1: "tr1",
          ru: "ru",
          sg2: "sg2",
          tw2: "tw2",
          vn2: "vn2",
          id2: "sg2"
        };

        const matchHistoryMapping = {
          br1: "americas",
          eun1: "europe",
          euw1: "europe",
          jp1: "asia",
          kr: "asia",
          la1: "americas",
          la2: "americas",
          na1: "americas",
          oc1: "asia",
          tr1: "europe",
          ru: "europe",
          sg2: "asia",
          tw2: "asia",
          vn2: "asia"
        };

        const tftApiRegion = regionMapping[region];
        const matchHistoryRegion = matchHistoryMapping[region];

        if (!tftApiRegion || !matchHistoryRegion) {
          return interaction.editReply({
            content: `Error: The region "${region}" is not supported.`,
            ephemeral: true
          });
        }

        const summonerResponse = await axios.get(
          `https://${tftApiRegion}.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${puuid}`,
          {
            headers: { "X-Riot-Token": process.env.RIOT_API }
          }
        );

        const summonerData = summonerResponse.data;

        const rankResponse = await axios.get(
          `https://${tftApiRegion}.api.riotgames.com/tft/league/v1/entries/by-summoner/${summonerData.id}`,
          {
            headers: { "X-Riot-Token": process.env.RIOT_API }
          }
        );
        const rankData = rankResponse.data.find(
          (entry) => entry.queueType === "RANKED_TFT"
        );

        let rank = "Unranked",
          lp = "0 LP",
          wins = 0,
          losses = 0,
          gamesPlayed = 0,
          winRate = "N/A";

        if (rankData) {
          rank = `${rankData.tier} ${rankData.rank}`;
          lp = `${rankData.leaguePoints} LP`;
          wins = rankData.wins;
          losses = rankData.losses;
          gamesPlayed = wins + losses;
          winRate =
            gamesPlayed > 0
              ? ((wins / gamesPlayed) * 100).toFixed(2) + "%"
              : "N/A";
        }

        const matchHistoryResponse = await axios.get(
          `https://${matchHistoryRegion}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?count=50`,
          {
            headers: { "X-Riot-Token": process.env.RIOT_API }
          }
        );

        let matchIds = matchHistoryResponse.data;
        if (!Array.isArray(matchIds) || matchIds.length === 0) {
          return interaction.editReply({
            content: "No recent TFT matches found.",
            ephemeral: true
          });
        }

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const batchSize = 5;
        let matchResults = [];

        for (let i = 0; i < matchIds.length; i += batchSize) {
          const batch = matchIds.slice(i, i + batchSize);

          const batchResults = await Promise.allSettled(
            batch.map((matchId) =>
              axios
                .get(
                  `https://${matchHistoryRegion}.api.riotgames.com/tft/match/v1/matches/${matchId}`,
                  { headers: { "X-Riot-Token": process.env.RIOT_API } }
                )
                .then((res) => res.data)
                .catch((err) => {
                  if (err.response?.status === 429) return null;
                  return null;
                })
            )
          );

          const successfulMatches = batchResults
            .filter((result) => result.status === "fulfilled" && result.value)
            .map((result) => result.value);

          matchResults.push(...successfulMatches);
          await delay(1200);
        }

        if (matchResults.length === 0) {
          return interaction.editReply({
            content: "No valid match data found.",
            ephemeral: true
          });
        }

        let totalPlacement = 0,
          top4Count = 0,
          firstPlaceCount = 0;

        matchResults.forEach((match) => {
          const playerData = match.info.participants.find(
            (p) => p.puuid === puuid
          );
          if (playerData) {
            totalPlacement += playerData.placement;
            if (playerData.placement <= 4) top4Count++;
            if (playerData.placement === 1) firstPlaceCount++;
          }
        });

        const avgPlacement =
          matchResults.length > 0
            ? (totalPlacement / matchResults.length).toFixed(2)
            : "N/A";

        const top4Rate = matchResults.length
          ? ((top4Count / matchResults.length) * 100).toFixed(2) + "%"
          : "N/A";
        const firstPlaceRate = matchResults.length
          ? ((firstPlaceCount / matchResults.length) * 100).toFixed(2) + "%"
          : "N/A";

        const ddragonVersionsRes = await axios.get(
          "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        const latestVersion = ddragonVersionsRes.data?.[0];

        const profileIconId = summonerData.profileIconId;
        const profileIcon = profileIconId
          ? `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/${profileIconId}.png`
          : `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/0.png`;

        const embed = new EmbedBuilder()
          .setColor("Blurple")
          .setTitle(`${name}#${tag} - TFT Stats (Last 50 Games)`)
          .setThumbnail(profileIcon)
          .addFields(
            { name: "Region", value: region.toUpperCase(), inline: true },
            { name: "Rank", value: `${rank} (${lp})`, inline: true },
            {
              name: "Total Games",
              value: `${matchResults.length}`,
              inline: true
            },
            { name: "Avg Placement", value: `${avgPlacement}`, inline: true },
            { name: "Top 4 Rate", value: `${top4Rate}`, inline: true },
            {
              name: "1st Place Rate",
              value: `${firstPlaceRate}`,
              inline: true
            },
            { name: "Win Rate", value: `${winRate}`, inline: true }
          )
          .setFooter({ text: "Data provided by Riot API" });

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error("Full API Error:", error.response?.data || error.message);
        await interaction.editReply({
          content:
            "Error retrieving TFT stats. Check the Riot ID and try again.",
          ephemeral: true
        });
      }
    }
    if (subcommand === "osu") {
      const player = interaction.options.getString("player");
      const type = interaction.options.getString("type");

      await interaction.deferReply();

      try {
        const accessToken = await getOsuAccessToken();
        if (!accessToken) {
          return interaction.editReply({
            content: "Failed to retrieve osu! API token.",
            ephemeral: true
          });
        }

        const userResponse = await axios.get(
          `https://osu.ppy.sh/api/v2/users/${encodeURIComponent(player)}/osu`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const user = userResponse.data;
        if (!user || !user.id) {
          return interaction.editReply({
            content: "User not found on osu!",
            ephemeral: true
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
            ephemeral: true
          });
        }

        const playsResponse = await axios.get(apiUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const plays = playsResponse.data;

        if (!Array.isArray(plays) || plays.length === 0) {
          return interaction.editReply({
            content: `No ${type} plays found for this user.`,
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setColor("Blue")
          .setTitle(
            `${user.username}'s ${
              type === "top" ? "Top Plays" : "Most Recent Play"
            }`
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
              inline: false
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

          const beatmapPath = path.join(
            __dirname,
            `../../../extra/maps/${beatmap.id}.osu`
          );

          const downloaded = await downloadBeatmap(beatmap.id, beatmapPath);
          let ppValue = "N/A";

          if (downloaded) {
            const beatmapContent = fs.readFileSync(beatmapPath, "utf8");
            const cleanedContent = beatmapContent.replace(/^\uFEFF/, "").trim();

            const beatmapData = new Beatmap(cleanedContent);
            const performance = new Performance({
              mods: play.mods.join(""),
              combo: play.max_combo,
              n300: play.statistics.count_300,
              n100: play.statistics.count_100,
              n50: play.statistics.count_50,
              misses: play.statistics.count_miss,
              accuracy: play.accuracy * 100
            });
            const result = performance.calculate(beatmapData);
            ppValue = result.pp.toFixed(2);
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
            inline: false
          });
        }

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error(
          "Error retrieving osu! stats:",
          error.response?.data || error.message
        );
        await interaction.editReply({
          content: "An error occurred while retrieving osu! stats.",
          ephemeral: true
        });
      }
    }
  }
};
