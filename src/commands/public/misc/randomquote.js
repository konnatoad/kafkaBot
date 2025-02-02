const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const Quote = require("../../../schemas/quoteSchema");

const handleError = async (interaction, message) => {
  console.error(message);
  await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
};

const recentlyUsedQuotesBuffer = new Set();

const getBufferSize = (totalQuotes) => {
  const targetProbability = 0.0005;
  let bufferSize = Math.max(1, Math.ceil(targetProbability * totalQuotes));
  return bufferSize;
};

const getRandomQuote = async (interaction, user) => {
  try {
    let query = { guildId: interaction.guildId };
    if (user) {
      query.authorId = user.id;
    }

    const quotes = await Quote.find(query).exec();
    const count = quotes.length;

    if (count === 0) {
      return handleError(
        interaction,
        "No quotes found for the specified user."
      );
    }

    const bufferSize = getBufferSize(count);

    const weights = quotes.map((quote) => {
      return recentlyUsedQuotesBuffer.has(quote._id.toString()) ? 1 : 10;
    });

    const cumulativeWeights = [];
    weights.reduce((acc, weight, index) => {
      cumulativeWeights[index] = acc + weight;
      return cumulativeWeights[index];
    }, 0);

    const randomWeight =
      Math.random() * cumulativeWeights[cumulativeWeights.length - 1];
    const selectedQuoteIndex = cumulativeWeights.findIndex(
      (cumulativeWeight) => cumulativeWeight >= randomWeight
    );
    const selectedQuote = quotes[selectedQuoteIndex];

    recentlyUsedQuotesBuffer.add(selectedQuote._id.toString());

    let content = selectedQuote.content.replace(
      /<@(\d+)>/g,
      (match, userID) => {
        const user = interaction.guild.members.cache.get(userID);
        return user ? `@${user.displayName}` : match;
      }
    );

    const formattedDate = selectedQuote.date.toLocaleDateString();
    const formattedQuote = `**Content:** ${content}\n**Author:** ${selectedQuote.author}\n**Date:** ${formattedDate}`;
    await interaction.reply({ content: formattedQuote });
  } catch (error) {
    console.error("Database query error:", error);
    handleError(interaction, "Failed to get random quote.");
  }
};

const data = new SlashCommandBuilder()
  .setName("randomquote")
  .setDescription("Get a random quote")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("Filter quotes by user")
      .setRequired(false)
  );

module.exports = {
  data,
  async run({ interaction }) {
    try {
      const user = interaction.options.getUser("user");
      await getRandomQuote(interaction, user);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  },
};
