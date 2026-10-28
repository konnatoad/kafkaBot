const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");
const Quote = require("../../../../schemas/quoteSchema");
const DailyQuote = require("../../../../schemas/dailyQuoteSchema");
const logger = require("../../../../extra/logger");
const { pickOne } = require("../../../../utils/random");

// how many past daily quotes a server won't see again
const RECENT_LIMIT = 20;

const sendDailyQuote = async (client) => {
  const guilds = await DailyQuote.find();

  for (const guild of guilds) {
    try {
      const channel = await client.channels
        .fetch(guild.channelId)
        .catch(() => null);
      if (!channel) {
        logger.warn(`Channel not found for guild ${guild.guildId}. Skipping.`);
        continue;
      }

      const permissions = channel.permissionsFor(client.user);
      if (!permissions || !permissions.has("SendMessages")) {
        logger.warn(
          `Missing permissions to send messages in channel ${channel.id}.`,
        );
        continue;
      }

      const quotes = await Quote.find({ guildId: guild.guildId });
      if (quotes.length === 0) {
        logger.warn(`No quotes found for guild ${guild.guildId}. Skipping.`);
        continue;
      }

      const recent = guild.recentQuotes || [];
      const fresh = quotes.filter(
        (quote) => !recent.includes(quote._id.toString()),
      );
      if (!fresh.length) {
        logger.info(
          `All quotes used in guild ${guild.guildId}, starting over.`,
        );
      }
      const randomQuote = pickOne(fresh.length ? fresh : quotes);
      const formattedDate = randomQuote.date.toLocaleDateString("fi-FI");

      const updatedGuild = await DailyQuote.findOneAndUpdate(
        { guildId: guild.guildId },
        {
          $set: {
            recentQuotes: [
              ...(fresh.length ? recent : []),
              randomQuote._id.toString(),
            ].slice(-RECENT_LIMIT),
          },
          $inc: { quoteCount: 1 },
        },
        { returnDocument: "after" },
      );

      const quoteNumber = updatedGuild.quoteCount;
      const currentDate = new Date().toLocaleDateString("fi-FI");

      const embed = new EmbedBuilder()
        .setTitle(`**Quote of the Day #${quoteNumber}** \n${currentDate}`)
        .setDescription(`*${randomQuote.content}*`)
        .setColor("Blurple")
        .addFields(
          { name: "Author", value: randomQuote.author, inline: true },
          { name: "Date", value: formattedDate, inline: true },
        );

      await channel.send({ embeds: [embed] });
      logger.info(
        `Quote sent to channel ${channel.id} in guild ${guild.guildId}.`,
      );
    } catch (error) {
      logger.error(
        `An error occurred while sending a quote to guild ${guild.guildId}:`,
        error,
      );
    }
  }
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
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disable daily quotes for this server"),
    ),

  async run({ interaction }) {
    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "enable") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const channel = interaction.options.getChannel("channel");
        await DailyQuote.findOneAndUpdate(
          { guildId: interaction.guildId },
          {
            channelId: channel.id,
            $setOnInsert: { quoteCount: 0, recentQuotes: [] },
          },
          { upsert: true },
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
      }
    } catch (error) {
      logger.error("An error occurred:", error);

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

  sendDailyQuote,
};
