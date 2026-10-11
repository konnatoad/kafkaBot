const {
  SlashCommandBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");
const Quote = require("../../../../schemas/quoteSchema");
const logger = require("../../../../extra/logger");

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

// Who/where the command ran, so log lines are actionable
const describeContext = (interaction) =>
  `guild "${interaction.guild?.name}" (${interaction.guildId}), ` +
  `channel #${interaction.channel?.name ?? "unknown"} (${interaction.channelId}), ` +
  `user ${interaction.user.tag} (${interaction.user.id})`;

const describeError = (error) =>
  error ? ` | ${error.code ? `code ${error.code}: ` : ""}${error.stack || error}` : "";

const handleError = async (interaction, message, error, detail = "") => {
  logger.error(`/quote: ${message} [${describeContext(interaction)}${detail}]${describeError(error)}`);
  try {
    // Ephemeral = only the user who ran it sees it, with a "Dismiss message" link
    const send = interaction.deferred || interaction.replied ? "followUp" : "reply";
    await interaction[send]({
      content: message,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error("Failed to send error message:", error);
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
      return `\`\`\`text\n${start + index + 1}. Quote ID: ${quote._id
        }\nAuthor: ${quote.author
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
    logger.error("Error fetching quotes:", error);
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
      logger.error("Error navigating pages:", error);
    }
  });

  collector.on("end", async () => {
    try {
      await interaction.editReply({
        components: [],
      });
    } catch (error) {
      logger.error("Error ending collector:", error);
    }
  });
};

// Permissions the bot needs in the channel to fetch a message by ID
const ADD_QUOTE_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ReadMessageHistory,
];
const readablePerm = (flag) =>
  Object.keys(PermissionFlagsBits)
    .find((k) => PermissionFlagsBits[k] === flag)
    .replace(/([a-z])([A-Z])/g, "$1 $2");

const addQuote = async (interaction, messageId) => {
  const detail = `, messageId ${messageId}`;

  const missing = ADD_QUOTE_PERMS.filter((p) => !interaction.appPermissions?.has(p));
  if (missing.length || !interaction.channel) {
    const names = (missing.length ? missing : ADD_QUOTE_PERMS).map(readablePerm).join(", ");
    return handleError(
      interaction,
      `I don't have permission to read messages in this channel. Missing: **${names}**. ` +
      `Ask an admin to give my role these permissions here.`,
      null,
      `${detail}, missing perms: ${names}`
    );
  }

  if (!/^\d{17,20}$/.test(messageId)) {
    return handleError(
      interaction,
      "That doesn't look like a message ID. Right-click the message -> Copy Message ID (needs Developer Mode).",
      null,
      detail
    );
  }

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
    let reason;
    if (error.code === 10008) {
      reason = "Couldn't find that message in this channel. Make sure the ID is right and you run the command in the same channel as the message.";
    } else if (error.code === 50001 || error.code === 50013) {
      reason = "I don't have permission to read that message. Ask an admin to give my role **View Channel** and **Read Message History** in this channel.";
    } else {
      reason = "Failed to add quote due to an unexpected error. It has been logged.";
    }
    await handleError(interaction, reason, error, detail);
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
    await handleError(
      interaction,
      "Failed to remove quote. Please ensure the quote ID is correct.",
      error,
      `, quoteId ${quoteId}`
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
    await handleError(interaction, "Failed to remove all quotes.", error);
  }
};

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("quote")
    .setDescription("Manage quotes")
    .setDefaultMemberPermissions(PermissionFlagsBits.CreateGuildExpressions)
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
      logger.error("An error occurred:", error);
    }
  },
};
