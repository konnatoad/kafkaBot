const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");
const logger = require("../extra/logger");
const { splitRiotId } = require("./riotId");

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
  seasonalWinrate,
}) {
  const L = 10;
  const lines = [
    `${padRight("Region", L)}: ${String(region).toUpperCase()}`,
    `${padRight("Platform", L)}: ${String(platform).toUpperCase()}`,
    `${padRight("Level", L)}: ${fmtNum(accountLevel)}`,
    `${padRight("Peak", L)}: ${peakText || "N/A"}`,
    `${padRight("Games", L)}: ${fmtNum(seasonalGames)}`,
    `${padRight("Wins", L)}: ${fmtNum(seasonalWins)} (${seasonalWinrate})`,
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
      6,
    )} ${padRight(`${wins}W-${losses}L`, 7)} ${wr}`;
  });

  return "```txt\n" + lines.join("\n") + "\n```";
}

const subcommand = (subcommand) =>
  subcommand
    .setName("valorant")
    .setDescription("Get valorant player stats")
    .addStringOption((option) =>
      option
        .setName("player")
        .setDescription("Enter the Riot ID (e.g., Player#1234)")
        .setRequired(true),
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
          { name: "Korea", value: "kr" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("platform")
        .setDescription("Platform (Default PC)")
        .addChoices(
          { name: "PC", value: "pc" },
          { name: "Console", value: "console" },
        ),
    );

async function run(interaction) {
  const player = interaction.options.getString("player");
  const region = interaction.options.getString("region") || "eu";
  const platform = interaction.options.getString("platform") || "pc";

  await interaction.deferReply();

  const { name, tag } = splitRiotId(player);
  if (!name || !tag) {
    return interaction.editReply({
      content:
        "Invalid Riot ID format. Use `Player#Tag` (example: `TenZ#NA1`).",
    });
  }

  const cacheKey = `${region}:${platform}:${name.toLowerCase()}#${tag.toLowerCase()}`;
  const cached = VAL_CACHE.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return interaction.editReply(cached.payload);
  }

  const headers = {
    Authorization: process.env.VALORANT,
    "User-Agent": "KafkaBot/1.0",
  };

  try {
    // 1) Account (v1)
    let accountData = null;
    try {
      const accountRes = await axios.get(
        `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(
          name,
        )}/${encodeURIComponent(tag)}`,
        { headers },
      );
      accountData = accountRes.data?.data;
    } catch (err) {
      if (err.response?.data?.errors?.some((e) => e.code === 24)) {
        return interaction.editReply({
          content: "No Data",
        });
      }

      logger.error(
        "Valorant account error:",
        err.response?.data || err.message,
      );
      return interaction.editReply({
        content:
          "Couldn’t fetch account info. Check the Riot ID and try again.",
      });
    }

    // 2) MMR (v3)
    let mmrData = null;
    try {
      const mmrRes = await axios.get(
        `https://api.henrikdev.xyz/valorant/v3/mmr/${region}/${platform}/${encodeURIComponent(
          name,
        )}/${encodeURIComponent(tag)}`,
        { headers },
      );
      mmrData = mmrRes.data?.data;
    } catch (err) {
      logger.warn(
        "Valorant MMR v3 error (continuing):",
        err.response?.data || err.message,
      );
    }

    const riotId = `${accountData?.name ?? name}#${accountData?.tag ?? tag}`;
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

    const seasonal = Array.isArray(mmrData?.seasonal) ? mmrData.seasonal : [];

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
      seasonalWinrate,
    });
    const acts = mkActsBlock(seasonal);

    const trackerUrl = `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(
      riotId,
    )}/overview`;

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setAuthor({
        name: `${riotId} — Valorant`,
        iconURL: playerCard || undefined,
      })
      .setURL(trackerUrl)
      .setDescription(headline)
      .setThumbnail(playerCard || null)
      .addFields(
        { name: "Overview", value: overview, inline: false },
        { name: "Recent Acts", value: acts, inline: false },
      )
      .setFooter({
        text: "git gud uwu",
        iconURL: "https://cdn3.emoji.gg/emojis/5007-uwu.png",
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Tracker.gg")
        .setStyle(ButtonStyle.Link)
        .setURL(trackerUrl),
    );

    const payload = { embeds: [embed], components: [row] };

    VAL_CACHE.set(cacheKey, {
      expires: Date.now() + VAL_CACHE_TTL_MS,
      payload,
    });

    return interaction.editReply(payload);
  } catch (error) {
    logger.error(
      "Error fetching Valorant stats:",
      error.response?.data || error.message,
    );
    return interaction.editReply({
      content:
        "An error occurred while retrieving Valorant stats. Try again in a bit.",
    });
  }
}

module.exports = { subcommand, run };
