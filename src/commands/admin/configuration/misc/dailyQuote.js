const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Quote = require("../../../../schemas/quoteSchema");
const DailyQuote = require("../../../../schemas/dailyQuoteSchema");

const handleError = async (interaction, message) => {
  console.error(message);
  await interaction.reply({ content: message, ephemeral: true });
};

const sendDailyQuote = async (client) => {
  const guilds = await DailyQuote.find();
  for (const guild of guilds) {
    const channel = await client.channels
      .fetch(guild.channelId)
      .catch(() => null);
    if (!channel) continue;

    const quotes = await Quote.find({ guildId: guild.guildId }).exec();
    if (quotes.length === 0) continue;

    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    const formattedDate = randomQuote.date.toLocaleDateString();
    const messageContent = `**Content:** ${randomQuote.content}\n**Author:** ${randomQuote.author}\n**Date:** ${formattedDate}`;

    channel.send(messageContent).catch(console.error);
  }
};

const scheduleDailyQuote = async (client) => {
  const now = new Date();
  const nextRun = new Date();
  nextRun.setUTCHours(10, 0, 0, 0); // Set to 10:00 UTC
  if (now >= nextRun) {
    nextRun.setUTCDate(nextRun.getUTCDate() + 1); // If today is after 10:00 UTC, set to tomorrow
  }
  const delay = nextRun.getTime() - now.getTime();
  setTimeout(async function run() {
    await sendDailyQuote(client);
    setTimeout(run, 24 * 60 * 60 * 1000); // Run every 24 hours
  }, delay); // Run the first time after the delay
};

module.exports = {
  deleted: true,
  data: new SlashCommandBuilder()
    .setName("dailyquote")
    .setDescription("Manage the daily quote feature")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("Enable")
        .setDescription("Enable the daily quote feature")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send the daily quote in")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("Disable")
            .setDescription("Disable the daily quote feature")
        )
    ),
};
