const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const logger = require("../extra/logger");
const { splitRiotId } = require("./riotId");

// region choice -> the platform host for summoner and league lookups and the
// regional host for match history. Indonesia has no platform of its own and was
// missing from the match history table, so picking it always failed.
const ROUTES = {
  br1: { platform: "br1", matches: "americas" },
  eun1: { platform: "eun1", matches: "europe" },
  euw1: { platform: "euw1", matches: "europe" },
  jp1: { platform: "jp1", matches: "asia" },
  kr: { platform: "kr", matches: "asia" },
  la1: { platform: "la1", matches: "americas" },
  la2: { platform: "la2", matches: "americas" },
  na1: { platform: "na1", matches: "americas" },
  oc1: { platform: "oc1", matches: "asia" },
  tr1: { platform: "tr1", matches: "europe" },
  ru: { platform: "ru", matches: "europe" },
  sg2: { platform: "sg2", matches: "asia" },
  tw2: { platform: "tw2", matches: "asia" },
  vn2: { platform: "vn2", matches: "asia" },
  id2: { platform: "sg2", matches: "asia" },
};

const subcommand = (subcommand) =>
  subcommand
    .setName("tft")
    .setDescription("Get TFT player stats")
    .addStringOption((option) =>
      option
        .setName("player")
        .setDescription("Enter the Riot ID (e.g., Player#1234)")
        .setRequired(true),
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
          { name: "Indonesia (ID)", value: "id2" },
        )
        .setRequired(true),
    );

const MATCHES = 50;
// Riot's development keys allow 20 requests a second; 5 at a time with a pause stays under
const BATCH = 5;
const BATCH_PAUSE_MS = 1200;

async function riotGet(host, path) {
  const { data } = await axios.get(`https://${host}.api.riotgames.com${path}`, {
    headers: { "X-Riot-Token": process.env.RIOT_API },
  });
  return data;
}

const percent = (part, whole) =>
  whole ? `${((part / whole) * 100).toFixed(2)}%` : "N/A";

/** Match details for `ids`, in batches; ones that fail (rate limits too) are left out. */
async function fetchMatches(host, ids) {
  const matches = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = await Promise.all(
      ids
        .slice(i, i + BATCH)
        .map((id) =>
          riotGet(host, `/tft/match/v1/matches/${id}`).catch(() => null),
        ),
    );
    matches.push(...batch.filter(Boolean));
    await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE_MS));
  }
  return matches;
}

async function run(interaction) {
  const player = interaction.options.getString("player");
  const region = interaction.options.getString("region");
  await interaction.deferReply();

  const { name, tag } = splitRiotId(player);
  if (!name || !tag) {
    return interaction.editReply("Invalid Riot ID format. Use `Player#Tag`.");
  }
  const route = ROUTES[region];
  if (!route) {
    return interaction.editReply(
      `Error: The region "${region}" is not supported.`,
    );
  }

  try {
    const { puuid } = await riotGet(
      "europe",
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
    );
    const summoner = await riotGet(
      route.platform,
      `/tft/summoner/v1/summoners/by-puuid/${puuid}`,
    ).catch((error) => {
      if (error.response?.status === 404) return null;
      throw error;
    });
    if (!summoner) {
      return interaction.editReply(
        `${name}#${tag} hasn't played TFT in ${region.toUpperCase()}. Check the region.`,
      );
    }
    // Riot dropped the summoner id from summoner lookups, so leagues go by puuid too
    const leagues = await riotGet(
      route.platform,
      `/tft/league/v1/by-puuid/${puuid}`,
    );
    const ranked = leagues.find((entry) => entry.queueType === "RANKED_TFT");

    const matchIds = await riotGet(
      route.matches,
      `/tft/match/v1/matches/by-puuid/${puuid}/ids?count=${MATCHES}`,
    );
    if (!matchIds.length) {
      return interaction.editReply("No recent TFT matches found.");
    }
    const matches = await fetchMatches(route.matches, matchIds);
    if (!matches.length) {
      return interaction.editReply("No valid match data found.");
    }

    const placements = matches
      .map(
        (match) =>
          match.info.participants.find((p) => p.puuid === puuid)?.placement,
      )
      .filter(Boolean);
    const total = placements.reduce((sum, placement) => sum + placement, 0);

    const [latestVersion] = (
      await axios.get("https://ddragon.leagueoflegends.com/api/versions.json")
    ).data;
    const profileIcon = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/${summoner.profileIconId ?? 0}.png`;

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle(`${name}#${tag} - TFT Stats (Last ${matches.length} Games)`)
      .setThumbnail(profileIcon)
      .addFields(
        { name: "Region", value: region.toUpperCase(), inline: true },
        {
          name: "Rank",
          value: ranked
            ? `${ranked.tier} ${ranked.rank} (${ranked.leaguePoints} LP)`
            : "Unranked (0 LP)",
          inline: true,
        },
        { name: "Total Games", value: `${matches.length}`, inline: true },
        {
          name: "Avg Placement",
          value: matches.length ? (total / matches.length).toFixed(2) : "N/A",
          inline: true,
        },
        {
          name: "Top 4 Rate",
          value: percent(
            placements.filter((p) => p <= 4).length,
            matches.length,
          ),
          inline: true,
        },
        {
          name: "1st Place Rate",
          value: percent(
            placements.filter((p) => p === 1).length,
            matches.length,
          ),
          inline: true,
        },
        {
          name: "Win Rate",
          value: ranked
            ? percent(ranked.wins, ranked.wins + ranked.losses)
            : "N/A",
          inline: true,
        },
      )
      .setFooter({ text: "Data provided by Riot API" });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error("TFT stats lookup failed:", error.response?.data ?? error);
    await interaction.editReply(
      "Error retrieving TFT stats. Check the Riot ID and try again.",
    );
  }
}

module.exports = { subcommand, run };
