const { SlashCommandBuilder } = require("discord.js");
const Quote = require("../../../schemas/quoteSchema");

// Function to handle errors
const handleError = async (interaction, message) => {
  console.error(message);
  await interaction.reply({ content: message, ephemeral: true });
};

// Function to get a random quote from the database
const getRandomQuote = async (interaction, user) => {
  try {
    let query = { guildId: interaction.guildId };
    if (user) {
      query.authorId = user.id; // Change to authorId
    }

    const count = await Quote.countDocuments(query);
    if (count === 0) {
      return handleError(
        interaction,
        "No quotes found for the specified user."
      );
    }

    const randomIndex = Math.floor(Math.random() * count);
    const quote = await Quote.findOne(query).skip(randomIndex);

    let content = quote.content.replace(/<@(\d+)>/g, (match, userID) => {
      const user = interaction.guild.members.cache.get(userID);
      return user ? `@${user.displayName}` : match;
    });

    const formattedDate = quote.date.toLocaleDateString();
    const formattedQuote = `**Author:** ${quote.author}\n**Content:** ${content}\n**Date:** ${formattedDate}`;
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
