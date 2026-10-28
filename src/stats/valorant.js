const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");
const logger = require("../extra/logger");
const { splitRiotId } = require("./riotId");

// the same lookup within 30 seconds is answered from here
const CACHE_TTL_MS = 30_000;
/** "eu:pc:name#tag" -> { expires, payload } */
const cache = new Map();

function remember(key, payload) {
  const now = Date.now();
  for (const [old, entry] of cache) if (entry.expires <= now) cache.delete(old);
  cache.set(key, { expires: now + CACHE_TTL_MS, payload });
}

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
  return `${arrow} ${num > 0 ? "+" : ""}${num}`;
}

function pct(x) {
  const num = Number(x);
  return Number.isFinite(num) ? `${(num * 100).toFixed(1)}%` : "N/A";
}

const pad = (text, width) => String(text ?? "").padEnd(width);
const codeBlock = (lines) => "```txt\n" + lines.join("\n") + "\n```";

function headline(current) {
  const parts = [`**${current?.tier?.name || "Unrated"}**`];
  if (current?.rr != null) parts.push(`**${current.rr} RR**`);
  if (current?.last_change != null)
    parts.push(`Last **${fmtDelta(current.last_change)} RR**`);
  if (current?.elo) parts.push(`Elo **${fmtNum(current.elo)}**`);
  return parts.join(" • ");
}

function peakText(peak) {
  if (!peak?.tier?.name) return "N/A";
  const season = peak.season?.short
    ? ` (${String(peak.season.short).toUpperCase()})`
    : "";
  const rr = peak.rr != null ? ` • ${peak.rr} RR` : "";
  return `${peak.tier.name}${season}${rr}`;
}

function overviewBlock({ region, platform, account, mmr, seasonal }) {
  const games = seasonal.reduce((sum, s) => sum + Number(s.games || 0), 0);
  const wins = seasonal.reduce((sum, s) => sum + Number(s.wins || 0), 0);
  const winrate = games > 0 ? pct(wins / games) : "N/A";
  return codeBlock([
    `${pad("Region", 10)}: ${region.toUpperCase()}`,
    `${pad("Platform", 10)}: ${platform.toUpperCase()}`,
    `${pad("Level", 10)}: ${fmtNum(account?.account_level ?? "N/A")}`,
    `${pad("Peak", 10)}: ${peakText(mmr?.peak)}`,
    `${pad("Games", 10)}: ${fmtNum(games)}`,
    `${pad("Wins", 10)}: ${fmtNum(wins)} (${winrate})`,
  ]);
}

function actsBlock(seasonal) {
  if (!seasonal.length) return codeBlock(["No competitive history available."]);
  return codeBlock(
    seasonal
      .slice(-3)
      .reverse()
      .map((s) => {
        const act = s.season?.short
          ? String(s.season.short).toUpperCase()
          : "UNK";
        const rr = s.end_rr != null ? `${s.end_rr}RR` : "—";
        const wins = Number(s.wins || 0);
        const games = Number(s.games || 0);
        const losses = Math.max(0, games - wins);
        const winrate = games > 0 ? pct(wins / games) : "N/A";
        return `${pad(act, 6)} ${pad(s.end_tier?.name || "Unrated", 14)} ${pad(rr, 6)} ${pad(`${wins}W-${losses}L`, 7)} ${winrate}`;
      }),
  );
}

async function henrik(path) {
  const { data } = await axios.get(
    `https://api.henrikdev.xyz/valorant${path}`,
    {
      headers: {
        Authorization: process.env.VALORANT,
        "User-Agent": "KafkaBot/1.0",
      },
    },
  );
  return data?.data;
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
    return interaction.editReply(
      "Invalid Riot ID format. Use `Player#Tag` (example: `TenZ#NA1`).",
    );
  }

  const key = `${region}:${platform}:${name.toLowerCase()}#${tag.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return interaction.editReply(cached.payload);
  }

  const riotPath = `${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  try {
    let account;
    try {
      account = await henrik(`/v1/account/${riotPath}`);
    } catch (err) {
      // 24: Henrik has no player by that Riot ID
      if (err.response?.data?.errors?.some((e) => e.code === 24)) {
        return interaction.editReply(
          "Couldn't find a Valorant account for that Riot ID.",
        );
      }
      logger.error("Valorant account error:", err.response?.data ?? err);
      return interaction.editReply(
        "Couldn’t fetch account info. Check the Riot ID and try again.",
      );
    }

    // the card still shows without rank data, so a failure here isn't fatal
    const mmr = await henrik(`/v3/mmr/${region}/${platform}/${riotPath}`).catch(
      (err) => {
        logger.warn(
          "Valorant MMR v3 error (continuing):",
          err.response?.data ?? err,
        );
        return null;
      },
    );
    const seasonal = Array.isArray(mmr?.seasonal) ? mmr.seasonal : [];

    const riotId = `${account?.name ?? name}#${account?.tag ?? tag}`;
    const card = account?.card?.small || null;
    const trackerUrl = `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(riotId)}/overview`;

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setAuthor({
        name: `${riotId} — Valorant`,
        iconURL: card || undefined,
        url: trackerUrl,
      })
      .setDescription(headline(mmr?.current))
      .setThumbnail(card)
      .addFields(
        {
          name: "Overview",
          value: overviewBlock({ region, platform, account, mmr, seasonal }),
        },
        { name: "Recent Acts", value: actsBlock(seasonal) },
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
    remember(key, payload);
    return interaction.editReply(payload);
  } catch (error) {
    logger.error(
      "Error fetching Valorant stats:",
      error.response?.data ?? error,
    );
    return interaction.editReply(
      "An error occurred while retrieving Valorant stats. Try again in a bit.",
    );
  }
}

module.exports = { subcommand, run };
