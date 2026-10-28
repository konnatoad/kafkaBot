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

async function run(interaction) {
  const player = interaction.options.getString("player");
  const region = interaction.options.getString("region");

  await interaction.deferReply();

  const { name, tag } = splitRiotId(player);
  if (!name || !tag) {
    return interaction.editReply({
      content: "Invalid Riot ID format. Use `Player#Tag`.",
    });
  }

  try {
    const riotAccountResponse = await axios.get(
      `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
        name,
      )}/${encodeURIComponent(tag)}`,
      {
        headers: { "X-Riot-Token": process.env.RIOT_API },
      },
    );
    const puuid = riotAccountResponse.data.puuid;

    const route = ROUTES[region];
    const tftApiRegion = route?.platform;
    const matchHistoryRegion = route?.matches;

    if (!tftApiRegion || !matchHistoryRegion) {
      return interaction.editReply({
        content: `Error: The region "${region}" is not supported.`,
      });
    }

    const summonerResponse = await axios.get(
      `https://${tftApiRegion}.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${puuid}`,
      {
        headers: { "X-Riot-Token": process.env.RIOT_API },
      },
    );

    const summonerData = summonerResponse.data;

    const rankResponse = await axios.get(
      `https://${tftApiRegion}.api.riotgames.com/tft/league/v1/entries/by-summoner/${summonerData.id}`,
      {
        headers: { "X-Riot-Token": process.env.RIOT_API },
      },
    );
    const rankData = rankResponse.data.find(
      (entry) => entry.queueType === "RANKED_TFT",
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
        gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(2) + "%" : "N/A";
    }

    const matchHistoryResponse = await axios.get(
      `https://${matchHistoryRegion}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?count=50`,
      {
        headers: { "X-Riot-Token": process.env.RIOT_API },
      },
    );

    let matchIds = matchHistoryResponse.data;
    if (!Array.isArray(matchIds) || matchIds.length === 0) {
      return interaction.editReply({
        content: "No recent TFT matches found.",
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
              { headers: { "X-Riot-Token": process.env.RIOT_API } },
            )
            .then((res) => res.data)
            .catch((err) => {
              if (err.response?.status === 429) return null;
              return null;
            }),
        ),
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
      });
    }

    let totalPlacement = 0,
      top4Count = 0,
      firstPlaceCount = 0;

    matchResults.forEach((match) => {
      const playerData = match.info.participants.find((p) => p.puuid === puuid);
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
      "https://ddragon.leagueoflegends.com/api/versions.json",
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
          inline: true,
        },
        { name: "Avg Placement", value: `${avgPlacement}`, inline: true },
        { name: "Top 4 Rate", value: `${top4Rate}`, inline: true },
        {
          name: "1st Place Rate",
          value: `${firstPlaceRate}`,
          inline: true,
        },
        { name: "Win Rate", value: `${winRate}`, inline: true },
      )
      .setFooter({ text: "Data provided by Riot API" });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error("Full API Error:", error.response?.data || error.message);
    await interaction.editReply({
      content: "Error retrieving TFT stats. Check the Riot ID and try again.",
    });
  }
}

module.exports = { subcommand, run };
