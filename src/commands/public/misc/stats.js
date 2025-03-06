const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const { getOsuAccessToken } = require("../../../extra/osuAuth");
require("dotenv").config();
const { Beatmap, Performance } = require("rosu-pp-js");
const fs = require("fs");
const path = require("path");

async function downloadBeatmap(beatmapId, beatmapPath) {
  if (!fs.existsSync(beatmapPath)) {
    console.log(`Downloading beatmap: ${beatmapId}`);
    try {
      const beatmapResponse = await axios.get(
        `https://osu.ppy.sh/osu/${beatmapId}`,
        { responseType: "arraybuffer" }
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
              { name: "APAC", value: "ap" },
              { name: "Korea", value: "kr" }
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

      await interaction.deferReply();

      const [name, tag] = player.split("#");
      if (!name || !tag) {
        return interaction.editReply({
          content: "Invalid Riot ID format. Use `Player#Tag`.",
          ephemeral: true
        });
      }

      try {
        // Fetch Account Data
        let accountData = null;
        try {
          const accountResponse = await axios.get(
            `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(
              name
            )}/${encodeURIComponent(tag)}`,
            {
              headers: {
                Authorization: process.env.VALORANT,
                "User-Agent": "KafkaBot/1.0"
              }
            }
          );
          accountData = accountResponse.data.data;
        } catch (accountError) {
          // Handle Specific API Error Code 24
          if (accountError.response?.data?.errors?.some((e) => e.code === 24)) {
            return interaction.editReply({
              content: "No Data",
              ephemeral: true
            });
          }

          console.error(
            `Error fetching account data for ${player}:`,
            accountError.response?.data || accountError.message
          );
          return interaction.editReply({
            content:
              "An error occurred while retrieving account data. Please check the Riot ID and try again.",
            ephemeral: true
          });
        }

        // Fetch MMR Data
        let mmrData = null;
        try {
          const mmrResponse = await axios.get(
            `https://api.henrikdev.xyz/valorant/v2/mmr/${region}/${encodeURIComponent(
              name
            )}/${encodeURIComponent(tag)}`,
            {
              headers: {
                Authorization: process.env.VALORANT,
                "User-Agent": "KafkaBot/1.0"
              }
            }
          );
          mmrData = mmrResponse.data.data;
        } catch (mmrError) {
          console.warn(
            `No competitive MMR data found for ${player}. Defaulting to Unranked.`
          );
        }

        // Account Information
        const playerName = `${accountData.name}#${accountData.tag}`;
        const accountLevel = accountData.account_level || "N/A";
        const playerCard = accountData.card?.small || null;

        // MMR & Rank Information
        const currentRank =
          mmrData?.current_data?.currenttierpatched || "Unranked";
        const rankProgress = mmrData?.current_data?.ranking_in_tier ?? "N/A";
        const elo = mmrData?.current_data?.elo ?? "N/A";
        const mmrChange =
          mmrData?.current_data?.mmr_change_to_last_game ?? "N/A";
        const highestRank = mmrData?.highest_rank?.patched_tier || "N/A";

        // Competitive Act History
        let actHistory = "No competitive history available.";
        if (mmrData?.by_season) {
          const lastActs = Object.entries(mmrData.by_season)
            .filter(([_, data]) => data.final_rank_patched) // Filter only valid acts
            .slice(-3) // Get last 3 acts
            .reverse(); // Show latest first

          actHistory = lastActs.length
            ? lastActs
                .map(
                  ([act, data]) =>
                    `**${act.toUpperCase()}** → ${data.final_rank_patched} (${
                      data.wins
                    }W / ${data.number_of_games - data.wins}L of ${
                      data.number_of_games
                    } games)`
                )
                .join("\n")
            : "No ranked matches played.";
        }

        // Embed Creation
        const embed = new EmbedBuilder()
          .setColor("Blurple")
          .setTitle(`${playerName} - Valorant Stats`)
          .setThumbnail(playerCard)
          .addFields(
            { name: "Region", value: region.toUpperCase(), inline: true },
            {
              name: "Account Level",
              value: `${accountLevel}`,
              inline: true
            },
            {
              name: "Current Rank",
              value: `${currentRank}`,
              inline: true
            },
            {
              name: "Rank Progress",
              value: `${rankProgress}/100`,
              inline: true
            },
            { name: "Elo Rating", value: `${elo}`, inline: true },
            {
              name: "MMR Change",
              value: `${mmrChange} MMR`,
              inline: true
            },
            { name: "Highest Rank", value: highestRank, inline: true }
          )
          .setFooter({
            text: "git gud uwu",
            iconURL: "https://cdn3.emoji.gg/emojis/5007-uwu.png"
          });

        if (actHistory) {
          embed.addFields({
            name: "Competitive Act History",
            value: actHistory,
            inline: false
          });
        }

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error(
          "Error fetching Valorant stats:",
          error.response?.data || error.message
        );

        await interaction.editReply({
          content:
            "An error occurred while retrieving stats. Please check the Riot ID and try again.",
          ephemeral: true
        });
      }
    }
    if (subcommand === "tft") {
      const player = interaction.options.getString("player");
      const region = interaction.options.getString("region");

      await interaction.deferReply();

      const [name, tag] = player.split("#");
      if (!name || !tag) {
        return interaction.editReply({
          content: "Invalid Riot ID format. Use `Player#Tag`.",
          ephemeral: true
        });
      }

      try {
        console.log(`Fetching Riot ID: ${name}#${tag}`);

        // Get PUUID using Riot ID
        const riotAccountResponse = await axios.get(
          `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
            name
          )}/${encodeURIComponent(tag)}`,
          {
            headers: { "X-Riot-Token": process.env.RIOT_API }
          }
        );
        const puuid = riotAccountResponse.data.puuid;

        // Ensure a valid match history region mapping before using it
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

        // Regional API Mapping for Match History
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
          console.error(`Invalid region "${region}".`);
          return interaction.editReply({
            content: `Error: The region "${region}" is not supported.`,
            ephemeral: true
          });
        }

        console.log(`Using API Region: ${tftApiRegion}`);
        console.log(`Using Match History Region: ${matchHistoryRegion}`);

        if (!matchHistoryRegion) {
          console.error(
            `Invalid region "${region}". No match history region available.`
          );
          return interaction.editReply({
            content: `Error: The region "${region}" is not supported. Please select a valid region.`,
            ephemeral: true
          });
        }

        console.log(`Final Match History Region Used: ${matchHistoryRegion}`);

        // Fetch Summoner Data using PUUID
        const summonerResponse = await axios.get(
          `https://${tftApiRegion}.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${puuid}`,
          {
            headers: { "X-Riot-Token": process.env.RIOT_API }
          }
        );

        const summonerData = summonerResponse.data;

        // Fetch Ranked Data
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

        console.log(`Using match history region: ${matchHistoryRegion}`);

        // Fetch the last 50 match IDs (limit to 50 matches)
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

        console.log(`Retrieved ${matchIds.length} matches`);

        // Fetch Match Data in Batches
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const batchSize = 5;
        let matchResults = [];

        for (let i = 0; i < matchIds.length; i += batchSize) {
          const batch = matchIds.slice(i, i + batchSize);
          console.log(`Fetching match batch ${i / batchSize + 1}...`);

          const batchResults = await Promise.allSettled(
            batch.map((matchId) =>
              axios
                .get(
                  `https://${matchHistoryRegion}.api.riotgames.com/tft/match/v1/matches/${matchId}`,
                  { headers: { "X-Riot-Token": process.env.RIOT_API } }
                )
                .then((res) => res.data)
                .catch((err) => {
                  if (err.response?.status === 429) {
                    console.warn(
                      `Rate limit reached! Skipping match ${matchId}`
                    );
                    return null; // Skip this request to avoid errors
                  }
                  return null;
                })
            )
          );

          const successfulMatches = batchResults
            .filter((result) => result.status === "fulfilled" && result.value)
            .map((result) => result.value);

          matchResults.push(...successfulMatches);
          console.log(`Processed ${matchResults.length} matches so far.`);

          await delay(1200); // 1.2-second delay to avoid Riot API bans
        }

        console.log(`Successfully processed ${matchResults.length} matches.`);

        if (matchResults.length === 0) {
          return interaction.editReply({
            content: "No valid match data found.",
            ephemeral: true
          });
        }

        // Process Match Data
        let totalPlacement = 0,
          top4Count = 0,
          firstPlaceCount = 0;

        matchResults.forEach((match) => {
          const playerData = match.info.participants.find(
            (p) => p.puuid === puuid
          );
          if (playerData) {
            totalPlacement += playerData.placement; // Sum of placements
            if (playerData.placement <= 4) top4Count++; // Count top 4 placements
            if (playerData.placement === 1) firstPlaceCount++; // Count 1st place finishes
          }
        });

        // Calculate the correct average placement based on the actual 50 matches fetched
        const avgPlacement =
          matchResults.length > 0
            ? (totalPlacement / matchResults.length).toFixed(2)
            : "N/A"; // Ensure the correct calculation of avgPlacement

        const top4Rate = matchResults.length
          ? ((top4Count / matchResults.length) * 100).toFixed(2) + "%"
          : "N/A";
        const firstPlaceRate = matchResults.length
          ? ((firstPlaceCount / matchResults.length) * 100).toFixed(2) + "%"
          : "N/A";

        // Fetch the latest DDragon version dynamically
        const ddragonResponse = await fetch(
          "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        const ddragonVersions = await ddragonResponse.json();
        const latestVersion = ddragonVersions[0]; // Get the latest version

        // Create Embed Response
        const profileIconId = summonerData.profileIconId;
        const profileIcon = profileIconId
          ? `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/${profileIconId}.png`
          : "https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/0.png";

        const embed = new EmbedBuilder()
          .setColor("Blurple")
          .setTitle(`${name}#${tag} - TFT Stats (Last 50 Games)`)
          .setThumbnail(profileIcon)
          .addFields(
            {
              name: "Region",
              value: region.toUpperCase(),
              inline: true
            },
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

        // Get scores
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

          // Download map & compute PP via rosu-pp
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
              mods: play.mods.join(""), // e.g. "HDHR"
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
