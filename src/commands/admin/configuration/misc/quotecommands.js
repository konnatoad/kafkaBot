const {
  SlashCommandBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
  MessageFlags,
} = require("discord.js");
const Quote = require("../../../../schemas/quoteSchema");

const quotesPerPage = 4;

const createPaginationButtons = (currentPage, totalPages, uniqueId, user) => {
  const prevButton = new ButtonBuilder()
    .setCustomId(`prev_page_${uniqueId}`)
    .setLabel("Previous")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage === 1);

  const nextButton = new ButtonBuilder()
    .setCustomId(`next_page_${uniqueId}`)
    .setLabel("Next")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage === totalPages);

  const actionRow = new ActionRowBuilder().addComponents(
    prevButton,
    nextButton
  );

  if (user) {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`all_quotes_${uniqueId}`)
        .setLabel("Show All Quotes")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return [actionRow];
};

const handleError = async (interaction, message) => {
  console.error(message);
  try {
    await interaction.reply({
      content: message,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error("Failed to send error message:", error);
  }
};

const replaceMentions = async (content, guild) => {
  const mentionRegex = /<@!?(\d+)>|<@&(\d+)>|<(a)?:\w+:(\d+)>/g;
  let match;
  while ((match = mentionRegex.exec(content))) {
    if (match[1]) {
      // User mention
      const userID = match[1];
      const member = await guild.members.fetch(userID).catch(() => null);
      if (member) {
        content = content.replace(match[0], `@${member.displayName}`);
      }
    } else if (match[2]) {
      // Role mention
      const roleID = match[2];
      const role = guild.roles.cache.get(roleID);
      if (role) {
        content = content.replace(match[0], `@${role.name}`);
      }
    } else if (match[3] && match[4]) {
      // Emoji mention
      const animated = match[3] === "a";
      const emojiId = match[4];
      const emoji =
        guild.emojis.cache.get(emojiId) ||
        (await guild.emojis.fetch(emojiId).catch(() => null));
      if (emoji) {
        content = content.replace(match[0], emoji.toString());
      }
    }
  }
  return content;
};

const getQuotesPage = async (interaction, page = 1, uniqueId, user) => {
  try {
    const query = user
      ? { guildId: interaction.guildId, authorId: user.id }
      : { guildId: interaction.guildId };
    const quotes = await Quote.find(query);

    const totalPages = Math.ceil(quotes.length / quotesPerPage);
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * quotesPerPage;
    const end = start + quotesPerPage;
    const quotesPage = quotes.slice(start, end);

    let contentPromises = quotesPage.map(async (quote, index) => {
      let quoteContent = await replaceMentions(
        quote.content,
        interaction.guild
      );
      quoteContent = quoteContent.replace(/```/g, "\\`\\`\\`"); // Escape triple backticks if necessary
      const formattedDate = quote.date.toLocaleDateString();
      return `\`\`\`text\n${start + index + 1}. Quote ID: ${
        quote._id
      }\nAuthor: ${
        quote.author
      }\nContent: ${quoteContent}\nDate: ${formattedDate}\n\`\`\``;
    });

    let content = await Promise.all(contentPromises);
    content = content.join("\n");

    if (quotes.length === 0) {
      content = user
        ? `No quotes found for ${user.toString()}.`
        : "No quotes found.";
    }

    await interaction.editReply({
      content: user
        ? `Quotes for ${user.toString()} (Page ${page}/${totalPages}):\n\n${content}`
        : `All Quotes (Page ${page}/${totalPages}):\n\n${content}`,
      components: createPaginationButtons(page, totalPages, uniqueId, user),
    });
  } catch (error) {
    await handleError(
      interaction,
      "Failed to load quotes. Please try again later."
    );
    console.error("Error fetching quotes:", error);
  }
};

const setupCollector = (interaction, uniqueId, user) => {
  const userId = interaction.user.id;
  const filter = (i) => i.user.id === userId && i.customId.endsWith(uniqueId);

  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    time: 300000, // 5 minutes
  });

  collector.on("collect", async (buttonInteraction) => {
    try {
      const pageMatch =
        buttonInteraction.message.content.match(/Page (\d+)\/(\d+)/);
      let currentPage = parseInt(pageMatch[1]);
      const totalPages = parseInt(pageMatch[2]);

      if (buttonInteraction.customId === `prev_page_${uniqueId}`) {
        currentPage = Math.max(currentPage - 1, 1);
      } else if (buttonInteraction.customId === `next_page_${uniqueId}`) {
        currentPage = Math.min(currentPage + 1, totalPages);
      } else if (buttonInteraction.customId === `all_quotes_${uniqueId}`) {
        user = null; // Show all quotes, set user to null
        await buttonInteraction.deferUpdate(); // Defer update before fetching data
        await getQuotesPage(interaction, currentPage, uniqueId, user);
        return; // Exit early to prevent further processing
      }

      await buttonInteraction.deferUpdate(); // Defer update before fetching data
      await getQuotesPage(interaction, currentPage, uniqueId, user);
    } catch (error) {
      await handleError(
        buttonInteraction,
        "Failed to navigate pages. Please try again later."
      );
      console.error("Error navigating pages:", error);
    }
  });

  collector.on("end", async () => {
    try {
      await interaction.editReply({
        components: [],
      });
    } catch (error) {
      console.error("Error ending collector:", error);
    }
  });
};

const addQuote = async (interaction, messageId) => {
  try {
    const message = await interaction.channel.messages.fetch(messageId);
    const quote = new Quote({
      guildId: interaction.guildId,
      author: message.author.tag,
      authorId: message.author.id,
      content: message.content,
      date: message.createdAt,
      addedBy: interaction.user.tag,
    });

    await quote.save();
    await interaction.reply({
      content: `Quote added: "${message.content}" by ${message.author.tag}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    handleError(
      interaction,
      "Failed to add quote. Please ensure the message ID is correct."
    );
  }
};

const removeQuote = async (interaction, quoteId) => {
  try {
    const result = await Quote.findByIdAndDelete(quoteId);
    const replyMessage = result
      ? "Quote removed successfully."
      : "Quote not found.";
    await interaction.reply({
      content: replyMessage,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    handleError(
      interaction,
      "Failed to remove quote. Please ensure the quote ID is correct."
    );
  }
};

const removeAllQuotes = async (interaction) => {
  try {
    await Quote.deleteMany({ guildId: interaction.guildId });
    await interaction.reply({
      content: "All quotes removed successfully.",
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    handleError(interaction, "Failed to remove all quotes.");
  }
};

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("quote")
    .setDescription("Manage quotes")
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
      subcommand
        .setName("list")
        .setDescription("List all quotes")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Filter quotes by user")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("removeall")
        .setDescription("Remove all quotes from the server")
    ),
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
        const user = interaction.options.getUser("user");
        const uniqueId = `${interaction.user.id}-${Date.now()}`;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await getQuotesPage(interaction, 1, uniqueId, user);
        setupCollector(interaction, uniqueId, user);
      } else if (subcommand === "removeall") {
        await removeAllQuotes(interaction);
      }
    } catch (error) {
      console.error("An error occurred:", error);
    }
  },
};
