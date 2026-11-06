const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
  ComponentType,
} = require("discord.js");
const TriviaConfig = require("../../../schemas/TriviaConfig");
const TriviaStats = require("../../../schemas/TriviaStats");
const logger = require("../../../extra/logger");
const { fetchCategories } = require("../../../utils/trivia");

const data = new SlashCommandBuilder()
  .setName("trivia")
  .setDescription("The daily trivia question for this server.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("setup")
      .setDescription("Configure the daily trivia system for this server.")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel where the daily trivia question is posted")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("time")
          .setDescription("Time to post the question (HH:MM, 24h format)")
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("timezone")
          .setDescription(
            "Your timezone — start typing to search (e.g. London, New_York)",
          )
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("difficulty")
          .setDescription("Question difficulty (default: random)")
          .setRequired(false)
          .addChoices(
            { name: "Easy", value: "easy" },
            { name: "Medium", value: "medium" },
            { name: "Hard", value: "hard" },
            { name: "Random", value: "random" },
          ),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("disable")
      .setDescription("Disable the daily trivia system for this server."),
  );

const setup = async ({ interaction }) => {
  if (!interaction.inGuild()) {
    return interaction.reply({
      content: "Run this inside a server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const timeInput = interaction.options.getString("time", true);
  const timezone = interaction.options.getString("timezone", true);
  const difficulty = interaction.options.getString("difficulty") ?? "random";
  const channel = interaction.options.getChannel("channel", true);

  if (!/^\d{2}:\d{2}$/.test(timeInput)) {
    return interaction.reply({
      content: "Invalid time format. Use HH:MM (e.g. `08:30`).",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Validate timezone in case someone bypasses autocomplete
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    return interaction.reply({
      content: "Invalid timezone. Please use the autocomplete suggestions.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let categories;
  try {
    categories = await fetchCategories();
  } catch (err) {
    logger.error("trivia setup: failed to fetch categories:", err);
    return interaction.editReply({
      content:
        "Failed to fetch trivia categories from the API. Try again later.",
    });
  }

  const options = [
    new StringSelectMenuOptionBuilder()
      .setLabel("Random (any category)")
      .setValue("random"),
    ...categories.map((cat) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(cat.name.slice(0, 100))
        .setValue(String(cat.id)),
    ),
  ].slice(0, 25);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("trivia_category_select")
    .setPlaceholder("Pick one or more categories (or leave as Random)")
    .setMinValues(1)
    .setMaxValues(Math.max(1, options.length))
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(menu);

  const reply = await interaction.editReply({
    content: "Select the trivia categories for this server:",
    components: [row],
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    filter: (i) => i.user.id === interaction.user.id,
    time: 60_000,
    max: 1,
  });

  collector.on("collect", async (selectInteraction) => {
    await selectInteraction.deferUpdate();

    const selected = selectInteraction.values;
    const isRandom = selected.includes("random");

    let categoryIds = [];
    let categoryNames = [];

    if (!isRandom) {
      categoryIds = selected;
      categoryNames = selected.map((id) => {
        const found = categories.find((c) => String(c.id) === id);
        return found ? found.name : id;
      });
    }

    try {
      await TriviaConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          channelId: channel.id,
          time: timeInput,
          timezone,
          difficulty,
          categoryIds,
          categoryNames,
          enabled: true,
          lastSentDate: null,
        },
        { upsert: true, returnDocument: "after" },
      );

      const categoryDisplay = isRandom
        ? "Random (any category)"
        : categoryNames.join(", ");

      await interaction.editReply({
        content:
          `✅ Trivia set up!\n` +
          `**Channel:** ${channel}\n` +
          `**Time:** ${timeInput} (${timezone})\n` +
          `**Difficulty:** ${difficulty}\n` +
          `**Categories:** ${categoryDisplay}`,
        components: [],
      });
    } catch (err) {
      logger.error("trivia setup: failed to save config:", err);
      await interaction.editReply({
        content: "Failed to save trivia configuration.",
        components: [],
      });
    }
  });

  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      await interaction.editReply({
        content: "Timed out. Run `/trivia setup` again.",
        components: [],
      });
    }
  });
};

const disable = async ({ interaction }) => {
  if (!interaction.inGuild()) {
    return interaction.reply({
      content: "Run this inside a server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    const cfg = await TriviaConfig.findOne({ guildId: interaction.guildId });

    if (!cfg) {
      return interaction.reply({
        content: "Trivia has not been set up in this server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!cfg.enabled) {
      return interaction.reply({
        content: "Trivia is already disabled.",
        flags: MessageFlags.Ephemeral,
      });
    }

    cfg.enabled = false;
    await cfg.save();
    await TriviaStats.deleteMany({ guildId: interaction.guildId });

    return interaction.reply({
      content:
        "✅ Daily trivia has been disabled and all answer history has been cleared. Run `/trivia setup` to re-enable it.",
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error("trivia disable error:", err);
    return interaction.reply({
      content: "Failed to disable trivia.",
      flags: MessageFlags.Ephemeral,
    });
  }
};

const autocomplete = async ({ interaction }) => {
  const focused = interaction.options.getFocused(true);
  if (focused.name !== "timezone") return;

  const query = focused.value.toLowerCase().replace(/\s+/g, "_");
  const matches = Intl.supportedValuesOf("timeZone")
    .filter((tz) => tz.toLowerCase().includes(query))
    .slice(0, 25)
    .map((tz) => ({ name: tz, value: tz }));

  // Discord drops suggestions that come after the user kept typing; that's fine
  await interaction.respond(matches).catch(() => {});
};

module.exports = { data, subcommands: { setup, disable }, autocomplete };
