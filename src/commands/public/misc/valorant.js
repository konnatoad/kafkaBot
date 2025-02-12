const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
require("dotenv").config();

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
        .setDescription("Get TFT player stats (Coming Soon)")
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
          ephemeral: true,
        });
      }

      try {
        // **1. Fetch Account Data**
        let accountData = null;
        try {
          const accountResponse = await axios.get(
            `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(
              name
            )}/${encodeURIComponent(tag)}`,
            {
              headers: {
                Authorization: process.env.VALORANT,
                "User-Agent": "KafkaBot/1.0",
              },
            }
          );
          accountData = accountResponse.data.data;
        } catch (accountError) {
          // **Handle Specific API Error Code 24**
          if (accountError.response?.data?.errors?.some((e) => e.code === 24)) {
            return interaction.editReply({
              content: "No Data",
              ephemeral: true,
            });
          }

          console.error(
            `Error fetching account data for ${player}:`,
            accountError.response?.data || accountError.message
          );
          return interaction.editReply({
            content:
              "An error occurred while retrieving account data. Please check the Riot ID and try again.",
            ephemeral: true,
          });
        }

        // **2. Fetch MMR Data (Rank)**
        let mmrData = null;
        try {
          const mmrResponse = await axios.get(
            `https://api.henrikdev.xyz/valorant/v2/mmr/${region}/${encodeURIComponent(
              name
            )}/${encodeURIComponent(tag)}`,
            {
              headers: {
                Authorization: process.env.VALORANT,
                "User-Agent": "KafkaBot/1.0",
              },
            }
          );
          mmrData = mmrResponse.data.data;
        } catch (mmrError) {
          console.warn(
            `No competitive MMR data found for ${player}. Defaulting to Unranked.`
          );
        }

        // **Account Information**
        const playerName = `${accountData.name}#${accountData.tag}`;
        const accountLevel = accountData.account_level || "N/A";
        const playerCard = accountData.card?.large || null;

        // **MMR & Rank Information (No Error on Missing Data)**
        const currentRank =
          mmrData?.current_data?.currenttierpatched || "Unranked";
        const rankProgress = mmrData?.current_data?.ranking_in_tier ?? "N/A";
        const elo = mmrData?.current_data?.elo ?? "N/A";
        const mmrChange =
          mmrData?.current_data?.mmr_change_to_last_game ?? "N/A";
        const highestRank = mmrData?.highest_rank?.patched_tier || "N/A";

        // **Competitive Act History (No Crash if Current Act is Missing)**
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
                    }W / ${data.number_of_games}G)`
                )
                .join("\n")
            : "No ranked matches played.";
        }

        // **Embed Creation**
        const embed = new EmbedBuilder()
          .setColor("Blurple")
          .setTitle(`${playerName} - Valorant Stats`)
          .setThumbnail(playerCard)
          .addFields(
            { name: "Region", value: region.toUpperCase(), inline: true },
            { name: "Account Level", value: `${accountLevel}`, inline: true },
            { name: "Current Rank", value: `${currentRank}`, inline: true },
            {
              name: "Rank Progress",
              value: `${rankProgress}/100`,
              inline: true,
            },
            { name: "Elo Rating", value: `${elo}`, inline: true },
            { name: "MMR Change", value: `${mmrChange} MMR`, inline: true },
            { name: "Highest Rank", value: highestRank, inline: true }
          )
          .setFooter({
            text: "git gud uwu",
            iconURL: "https://cdn3.emoji.gg/emojis/5007-uwu.png",
          });

        if (actHistory) {
          embed.addFields({
            name: "Competitive Act History",
            value: actHistory,
            inline: false,
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
          ephemeral: true,
        });
      }
    } else if (subcommand === "tft") {
      await interaction.reply("TFT stats are coming soon! 🚀");
    }
  },
};
