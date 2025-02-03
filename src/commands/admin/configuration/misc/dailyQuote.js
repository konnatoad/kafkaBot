const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const Quote = require("../../../../schemas/quoteSchema");
const DailyQuote = require("../../../../schemas/dailyQuoteSchema");

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

      const quotes = await Quote.find({ guildId: guild.guildId }).exec();
      if (quotes.length === 0) {
        console.log(`No quotes found for guild ${guild.guildId}. Skipping.`);
        continue;
      }

      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      const formattedDate = randomQuote.date.toLocaleDateString("fi-FI");

      // Increment the counter and get the updated value
      const updatedGuild = await DailyQuote.findOneAndUpdate(
        { guildId: guild.guildId },
        { $inc: { quoteCount: 1 } },
        { new: true }
      );

      const quoteNumber = updatedGuild.quoteCount;
      const currentDate = new Date().toLocaleDateString("fi-FI");
      const messageContent = `**Quote of the day #${quoteNumber} \n${currentDate}**\n\n**Content:** ${randomQuote.content}\n**Author:** ${randomQuote.author}\n**Date:** ${formattedDate}`;

      await channel.send(messageContent);
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
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("test").setDescription("Send a test daily quote")
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
          content: `Daily quotes enabled! Quotes will be sent to ${channel}.`,
        });
      } else if (subcommand === "disable") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        await DailyQuote.findOneAndDelete({ guildId: interaction.guildId });

        await interaction.editReply({
          content: "Daily quotes have been disabled.",
        });
      } else if (subcommand === "test") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        await sendDailyQuote(client);

        await interaction.editReply({
          content: "A test daily quote has been sent.",
        });
      }
    } catch (error) {
      console.error("An error occurred:", error);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: "An error occurred while processing the command.",
        });
      } else {
        await interaction.reply({
          content: "An error occurred while processing the command.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },

  scheduleDailyQuote,
};
