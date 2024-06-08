const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Quote = require("../../../../schemas/quoteSchema");
const { EmbedBuilder } = require("discord.js");

// Function to handle errors
const handleError = async (interaction, message) => {
  console.error(message);
  await interaction.reply({ content: message, ephemeral: true });
};

// Function to add a quote to the database
const addQuote = async (interaction, messageId) => {
  try {
    const message = await interaction.channel.messages.fetch(messageId);
    const quote = new Quote({
      guildId: interaction.guildId,
      author: message.author.tag,
      authorId: message.author.id, // Store the author's ID
      content: message.content,
      date: message.createdAt,
      addedBy: interaction.user.tag,
    });

    await quote.save();
    await interaction.reply({
      content: `Quote added: "${message.content}" by ${message.author.tag}`,
      ephemeral: true,
    });
  } catch (error) {
    handleError(
      interaction,
      "Failed to add quote. Please ensure the message ID is correct."
    );
  }
};

// Function to remove a quote from the database
const removeQuote = async (interaction, quoteId) => {
  try {
    const result = await Quote.findByIdAndDelete(quoteId);
    const replyMessage = result
      ? "Quote removed successfully."
      : "Quote not found.";
    await interaction.reply({ content: replyMessage, ephemeral: true });
  } catch (error) {
    handleError(
      interaction,
      "Failed to remove quote. Please ensure the quote ID is correct."
    );
  }
};

// Function to list all quotes as an embed
const listQuotes = async (interaction) => {
  try {
    const quotes = await Quote.find({ guildId: interaction.guildId });
    const embed = new EmbedBuilder()
      .setTitle("List of Quotes")
      .setColor("#0099ff")
      .setDescription("Here are all the quotes:");

    quotes.forEach((quote, index) => {
      // Replace <@userID> with actual user mentions
      let content = quote.content.replace(/<@(\d+)>/g, (match, userID) => {
        const user = interaction.guild.members.cache.get(userID);
        return user ? `@${user.displayName}` : match;
      });

      // Add a field for each quote
      embed.addFields({
        name: `Quote ID: ${quote._id}`,
        value: `**Author:** ${quote.author}\n**Content:** ${content}\n**Added by:** ${quote.addedBy}`,
      });

      // Add an empty field after each quote except for the last one
      if (index < quotes.length - 1) {
        embed.addFields({
          name: "\u200b", // Zero-width space to create an empty field
          value: "\u200b", // Zero-width space to create an empty field
          inline: false,
        });
      }
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    handleError(interaction, "Failed to list quotes.");
  }
};

// Function to remove all quotes from the database
const removeAllQuotes = async (interaction) => {
  try {
    await Quote.deleteMany({ guildId: interaction.guildId });
    await interaction.reply({
      content: "All quotes removed successfully.",
      ephemeral: true,
    });
  } catch (error) {
    handleError(interaction, "Failed to remove all quotes.");
  }
};

// Slash command data
const data = new SlashCommandBuilder()
  .setName("quote")
  .setDescription("Manage quotes")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Add a quote")
      .addStringOption((option) =>
        option
          .setName("messageid")
          .setDescription("The ID of the message to quote")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Remove a quote")
      .addStringOption((option) =>
        option
          .setName("quoteid")
          .setDescription("The ID of the quote to remove")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("list").setDescription("List all quotes")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("removeall")
      .setDescription("Remove all quotes from the server")
  );

// Export the command data and execution function
module.exports = {
  data,
  async run({ interaction }) {
    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "add") {
        const messageId = interaction.options.getString("messageid");
        await addQuote(interaction, messageId);
      } else if (subcommand === "remove") {
        const quoteId = interaction.options.getString("quoteid");
        await removeQuote(interaction, quoteId);
      } else if (subcommand === "list") {
        await listQuotes(interaction);
      } else if (subcommand === "removeall") {
        await removeAllQuotes(interaction);
      }
    } catch (error) {
      console.error("An error occurred:", error);
    }
  },
};
