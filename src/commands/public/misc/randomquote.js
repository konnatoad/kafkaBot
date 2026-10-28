const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const Quote = require("../../../schemas/quoteSchema");
const logger = require("../../../extra/logger");
const { pickOne } = require("../../../utils/random");

// how many recent picks per server to avoid repeating
const RECENT_LIMIT = 20;
// the quote plus its author and date lines have to fit in 2000 characters
const MAX_CONTENT = 1800;

/** guildId -> ids of the last RECENT_LIMIT quotes shown there */
const recentByGuild = new Map();

function pickFresh(guildId, quotes) {
  const recent = recentByGuild.get(guildId) ?? [];
  const fresh = quotes.filter((quote) => !recent.includes(String(quote._id)));
  const picked = pickOne(fresh.length ? fresh : quotes);
  recentByGuild.set(
    guildId,
    [...recent, String(picked._id)].slice(-RECENT_LIMIT),
  );
  return picked;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("randomquote")
    .setDescription("Get a random quote")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Filter quotes by user")
        .setRequired(false),
    ),

  async run({ interaction }) {
    const user = interaction.options.getUser("user");
    try {
      const query = { guildId: interaction.guildId };
      if (user) query.authorId = user.id;
      const quotes = await Quote.find(query);
      if (!quotes.length) {
        return interaction.reply({
          content: user ? `No quotes found for ${user}.` : "No quotes found.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const quote = pickFresh(interaction.guildId, quotes);
      let content = quote.content.replace(/<@!?(\d+)>/g, (raw, userId) => {
        const member = interaction.guild.members.cache.get(userId);
        return member ? `@${member.displayName}` : raw;
      });
      if (content.length > MAX_CONTENT)
        content = `${content.slice(0, MAX_CONTENT)}…`;

      await interaction.reply(
        `**Content:** ${content}\n**Author:** ${quote.author}\n**Date:** ${quote.date.toLocaleDateString("fi-FI")}`,
      );
    } catch (error) {
      logger.error("/randomquote failed:", error);
      await interaction
        .reply({
          content: "Failed to get random quote.",
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  },
};
