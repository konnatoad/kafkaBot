const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder
} = require("discord.js");
const Quote = require("../../../../schemas/quoteSchema");
const DailyQuote = require("../../../../schemas/dailyQuoteSchema");

const recentQuotes = {}; // Stores last 20 sent quotes per guild

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getRandomInt(seed, max) {
  return Math.floor(seededRandom(seed) * max);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const sendDailyQuote = async (client) => {
  const guilds = await DailyQuote.find();

  for (const guild of guilds) {
    try {
      const channel = await client.channels
        .fetch(guild.channelId)
        .catch(() => null);
      if (!channel) {
        console.log(`Channel not found for guild ${guild.guildId}. Skipping.`);
        continue;
      }

      const permissions = channel.permissionsFor(client.user);
      if (!permissions || !permissions.has("SendMessages")) {
        console.log(
          `Missing permissions to send messages in channel ${channel.id}.`
        );
        continue;
      }

      let quotes = await Quote.find({ guildId: guild.guildId }).exec();
      if (quotes.length === 0) {
        console.log(`No quotes found for guild ${guild.guildId}. Skipping.`);
        continue;
      }

      // Initialize recentQuotes buffer for the guild if not exists
      if (!recentQuotes[guild.guildId]) {
        recentQuotes[guild.guildId] = [];
      }

      // Filter out recently used quotes
      let availableQuotes = quotes.filter(
        (quote) => !recentQuotes[guild.guildId].includes(quote._id.toString())
      );

      // If all quotes are used, reset buffer
      if (availableQuotes.length === 0) {
        console.log(
          `All quotes used in guild ${guild.guildId}, resetting buffer.`
        );
        recentQuotes[guild.guildId] = [];
        availableQuotes = quotes; // Allow full randomization again
      }

      // Shuffle for extra randomness
      shuffle(availableQuotes);

      // Select a random quote with seeded randomness
      const seed = Date.now() + Math.random();
      const randomQuote =
        availableQuotes[getRandomInt(seed, availableQuotes.length)];

      const formattedDate = randomQuote.date.toLocaleDateString("fi-FI");

      // Update buffer with the new quote
      recentQuotes[guild.guildId].push(randomQuote._id.toString());

      // Limit buffer size (last 20 quotes)
      if (recentQuotes[guild.guildId].length > 20) {
        recentQuotes[guild.guildId].shift();
      }

      // Increment quote count
      const updatedGuild = await DailyQuote.findOneAndUpdate(
        { guildId: guild.guildId },
        { $inc: { quoteCount: 1 } },
        { new: true }
      );

      const quoteNumber = updatedGuild.quoteCount;
      const currentDate = new Date().toLocaleDateString("fi-FI");

      const embed = new EmbedBuilder()
        .setTitle(`**Quote of the Day #${quoteNumber}** \n${currentDate}`)
        .setDescription(`*${randomQuote.content}*`)
        .setColor("Blurple")
        .addFields(
          { name: "Author", value: randomQuote.author, inline: true },
          { name: "Date", value: formattedDate, inline: true }
        );

      await channel.send({ embeds: [embed] });
      console.log(
        `Quote sent to channel ${channel.id} in guild ${guild.guildId}.`
      );
    } catch (error) {
      console.error(
        `An error occurred while sending a quote to guild ${guild.guildId}:`,
        error
      );
    }
  }
};

const scheduleDailyQuote = async (client) => {
  const now = new Date();
  const nextRun = new Date();
  nextRun.setUTCHours(6, 0, 0, 0);

  if (now >= nextRun) {
    nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  }

  const delay = nextRun.getTime() - now.getTime();

  setTimeout(async function run() {
    console.log("Running daily quote schedule...");
    await sendDailyQuote(client);
    setTimeout(run, 24 * 60 * 60 * 1000); // Schedule the next run in 24 hours
  }, delay);

  console.log(`Daily quote scheduled to run at ${nextRun.toISOString()}`);
};

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("dailyquote")
    .setDescription("Manage the daily quote feature")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("enable")
        .setDescription("Enable daily quotes and set a channel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to send quotes to")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disable daily quotes for this server")
    ),

  async run({ interaction, client }) {
    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "enable") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const channel = interaction.options.getChannel("channel");
        await DailyQuote.findOneAndUpdate(
          { guildId: interaction.guildId },
          { channelId: channel.id, $setOnInsert: { quoteCount: 0 } },
          { upsert: true }
        );

        await interaction.editReply({
          content: `Daily quotes enabled! Quotes will be sent to ${channel}.`
        });
      } else if (subcommand === "disable") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        await DailyQuote.findOneAndDelete({ guildId: interaction.guildId });

        await interaction.editReply({
          content: "Daily quotes have been disabled."
        });
      }
    } catch (error) {
      console.error("An error occurred:", error);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: "An error occurred while processing the command."
        });
      } else {
        await interaction.reply({
          content: "An error occurred while processing the command.",
          flags: MessageFlags.Ephemeral
        });
      }
    }
  },

  scheduleDailyQuote
};
