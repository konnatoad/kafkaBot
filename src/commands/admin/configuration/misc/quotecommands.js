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

const QUOTES_PER_PAGE = 4;
// four quotes and their headers have to fit in one 2000-character message
const MAX_QUOTE_LENGTH = 350;
const QUOTE_ID = /^[0-9a-f]{24}$/i;

function pageButtons(page, totalPages, filteredByUser) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("quotes_previous")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 1),
    new ButtonBuilder()
      .setCustomId("quotes_next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === totalPages),
  );
  if (filteredByUser) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("quotes_all")
        .setLabel("Show All Quotes")
        .setStyle(ButtonStyle.Secondary),
    );
  }
  return [row];
}

// Only server + channel ID in logs; no usernames, channel names or message contents/IDs
const describeContext = (interaction) =>
  `guild "${interaction.guild?.name}" (${interaction.guildId}), channel ${interaction.channelId}`;

const describeError = (error) =>
  error
    ? ` | ${error.code ? `code ${error.code}: ` : ""}${error.stack || error}`
    : "";

// `log` is a short reason for #logs; `message` is what the user sees. Only "error" level pings.
const handleError = async (
  interaction,
  message,
  { log, level = "error", error } = {},
) => {
  logger[level](
    `/quote: ${log ?? message} [${describeContext(interaction)}]${describeError(error)}`,
  );
  try {
    // Ephemeral = only the user who ran it sees it, with a "Dismiss message" link
    const send =
      interaction.deferred || interaction.replied ? "followUp" : "reply";
    await interaction[send]({
      content: message,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error("Failed to send error message:", error);
  }
};

// The list shows quotes inside code blocks, where <@id> stays raw, so user and
// role mentions are swapped for their names.
const MENTION = /<@!?(\d+)>|<@&(\d+)>/g;

async function readableMentions(content, guild) {
  const names = await Promise.all(
    [...content.matchAll(MENTION)].map(async ([raw, userId, roleId]) => {
      if (userId) {
        const member = await guild.members.fetch(userId).catch(() => null);
        return [raw, member && `@${member.displayName}`];
      }
      const role = guild.roles.cache.get(roleId);
      return [raw, role && `@${role.name}`];
    }),
  );
  for (const [raw, name] of names) {
    if (name) content = content.replaceAll(raw, name);
  }
  return content;
}

/** The list message for `page`, clamped to the pages that exist. */
async function quotesPage(interaction, page, user) {
  const query = { guildId: interaction.guildId };
  if (user) query.authorId = user.id;

  const total = await Quote.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(total / QUOTES_PER_PAGE));
  page = Math.min(Math.max(page, 1), totalPages);
  const quotes = await Quote.find(query)
    .sort({ _id: 1 })
    .skip((page - 1) * QUOTES_PER_PAGE)
    .limit(QUOTES_PER_PAGE);

  const blocks = await Promise.all(
    quotes.map(async (quote, i) => {
      let text = await readableMentions(quote.content, interaction.guild);
      if (text.length > MAX_QUOTE_LENGTH) {
        text = `${text.slice(0, MAX_QUOTE_LENGTH)}…`;
      }
      // a ``` inside would close the code block early
      text = text.replace(/```/g, "\\`\\`\\`");
      const number = (page - 1) * QUOTES_PER_PAGE + i + 1;
      return `\`\`\`text\n${number}. Quote ID: ${quote._id}\nAuthor: ${quote.author}\nContent: ${text}\nDate: ${quote.date.toLocaleDateString()}\n\`\`\``;
    }),
  );

  const empty = user ? `No quotes found for ${user}.` : "No quotes found.";
  const heading = user ? `Quotes for ${user}` : "All Quotes";
  return {
    page,
    content: `${heading} (Page ${page}/${totalPages}):\n\n${blocks.join("\n") || empty}`,
    components: pageButtons(page, totalPages, Boolean(user)),
  };
}

async function listQuotes(interaction, user) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  let { page, content, components } = await quotesPage(interaction, 1, user);
  const message = await interaction.editReply({ content, components });

  // collect on the reply itself: interaction.channel can be null (uncached threads)
  const collector = message.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: 5 * 60 * 1000,
  });
  collector.on("collect", async (button) => {
    try {
      if (button.customId === "quotes_all") user = null;
      const step =
        { quotes_previous: -1, quotes_next: 1 }[button.customId] ?? 0;
      ({ page, content, components } = await quotesPage(
        interaction,
        page + step,
        user,
      ));
      await button.update({ content, components });
    } catch (error) {
      await handleError(
        button,
        "Failed to navigate pages. Please try again later.",
        {
          log: "list: page change failed",
          error,
        },
      );
    }
  });
  collector.on("end", () =>
    interaction.editReply({ components: [] }).catch((error) => {
      // 10008: the reply was dismissed before the buttons ran out
      if (error.code !== 10008)
        logger.error("/quote list: failed to remove buttons:", error);
    }),
  );
}

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
  const missing = ADD_QUOTE_PERMS.filter(
    (p) => !interaction.appPermissions?.has(p),
  );
  if (missing.length || !interaction.channel) {
    const names = (missing.length ? missing : ADD_QUOTE_PERMS)
      .map(readablePerm)
      .join(", ");
    return handleError(
      interaction,
      `I don't have permission to read messages in this channel. Missing: **${names}**. ` +
        `Ask an admin to give my role these permissions here.`,
      { log: `add: missing permissions (${names})`, level: "warn" },
    );
  }

  if (!/^\d{17,20}$/.test(messageId)) {
    return handleError(
      interaction,
      "That doesn't look like a message ID. Right-click the message -> Copy Message ID (needs Developer Mode).",
      { log: "add: invalid message ID format", level: "warn" },
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
    if (error.code === 10008) {
      await handleError(
        interaction,
        "Couldn't find that message in this channel. Make sure the ID is right and you run the command in the same channel as the message.",
        { log: "add: message not found in channel", level: "warn" },
      );
    } else if (error.code === 50001 || error.code === 50013) {
      await handleError(
        interaction,
        "I don't have permission to read that message. Ask an admin to give my role **View Channel** and **Read Message History** in this channel.",
        {
          log: `add: Discord denied access (code ${error.code})`,
          level: "warn",
        },
      );
    } else {
      await handleError(
        interaction,
        "Failed to add quote due to an unexpected error. It has been logged.",
        { log: "add: unexpected error", error },
      );
    }
  }
};

const removeQuote = async (interaction, quoteId) => {
  if (!QUOTE_ID.test(quoteId)) {
    return interaction.reply({
      content: "That isn't a quote ID. `/quote list` shows them.",
      flags: MessageFlags.Ephemeral,
    });
  }
  try {
    // scoped to this server: quote IDs are visible to anyone who can list them
    const result = await Quote.findOneAndDelete({
      _id: quoteId,
      guildId: interaction.guildId,
    });
    await interaction.reply({
      content: result ? "Quote removed successfully." : "Quote not found.",
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    await handleError(interaction, "Failed to remove quote.", {
      log: "remove: failed",
      error,
    });
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
    await handleError(interaction, "Failed to remove all quotes.", {
      log: "removeall: failed",
      error,
    });
  }
};

module.exports = {
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
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a quote")
        .addStringOption((option) =>
          option
            .setName("quoteid")
            .setDescription("The ID of the quote to remove")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List all quotes")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Filter quotes by user")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("removeall")
        .setDescription("Remove all quotes from the server"),
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
        await listQuotes(interaction, interaction.options.getUser("user"));
      } else if (subcommand === "removeall") {
        await removeAllQuotes(interaction);
      }
    } catch (error) {
      logger.error("An error occurred:", error);
    }
  },
};
