const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");

const ConfessionConfig = require("../../../schemas/ConfessionConfig");
const BlockedWords = require("../../../schemas/BlockedWords");
const {
  DEFAULT_WORDS,
  MAX_ADDED,
  cleanWord,
} = require("../../../utils/blockedWords");
const logger = require("../../../extra/logger");

const data = new SlashCommandBuilder()
  .setName("confessions")
  .setDescription("anonymous confessions in this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("setup")
      .setDescription("set the channel confessions are posted in")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel to publish confessions to")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("disable")
      .setDescription("turn off anonymous confessions"),
  )
  .addSubcommandGroup((group) =>
    group
      .setName("words")
      .setDescription("words confessions can't contain")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("add")
          .setDescription(
            "block a word, end it with * to block longer words too",
          )
          .addStringOption((opt) =>
            opt
              .setName("word")
              .setDescription("one word, like idiot or idio*")
              .setRequired(true)
              .setMaxLength(40),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("remove")
          .setDescription("unblock a word, default ones too")
          .addStringOption((opt) =>
            opt
              .setName("word")
              .setDescription("the word as /confessions words list shows it")
              .setRequired(true)
              .setMaxLength(40),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("list")
          .setDescription("show the words blocked in this server"),
      ),
  );

const notInGuild = (interaction) =>
  interaction.reply({
    content: "Run this inside a server.",
    flags: MessageFlags.Ephemeral,
  });

const setup = async ({ interaction }) => {
  if (!interaction.inGuild()) return notInGuild(interaction);
  try {
    const existing = await ConfessionConfig.findOne({
      guildId: interaction.guildId,
    });
    if (existing) {
      const current = await interaction.guild.channels
        .fetch(existing.channelId)
        .catch(() => null);

      return interaction.reply({
        content:
          `Confessions are already set up${current ? ` in ${current}` : ""}.\n` +
          "Use `/confessions disable` first if you want to change the channel.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const channel = interaction.options.getChannel("channel", true);

    await ConfessionConfig.create({
      guildId: interaction.guildId,
      channelId: channel.id,
    });

    return interaction.reply({
      content: `Confessions will be posted in ${channel}.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return interaction.reply({
        content:
          "Confessions were just set up by someone else. Use `/confessions disable` if you need to change it.",
        flags: MessageFlags.Ephemeral,
      });
    }

    logger.error("confessions setup error:", err);
    return interaction.reply({
      content: "Failed to save the confessions channel.",
      flags: MessageFlags.Ephemeral,
    });
  }
};

const disable = async ({ interaction }) => {
  if (!interaction.inGuild()) return notInGuild(interaction);
  try {
    const existing = await ConfessionConfig.findOne({
      guildId: interaction.guildId,
    });

    if (!existing) {
      return interaction.reply({
        content: "Confessions are not enabled in this server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await ConfessionConfig.deleteOne({ guildId: interaction.guildId });

    return interaction.reply({
      content: "Anonymous confessions have been disabled.",
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error("confessions disable error:", err);
    return interaction.reply({
      content: "Failed to disable confessions.",
      flags: MessageFlags.Ephemeral,
    });
  }
};

const reply = (interaction, content) =>
  interaction.reply({ content, flags: MessageFlags.Ephemeral });

// spoilered, with * escaped so Discord doesn't read it as italics
const shown = (word) => `||${word.replace("*", "\\*")}||`;

const spoiler = (words) => (words.length ? words.map(shown).join(" ") : "none");

// the typed word as stored, or a reply saying why it can't be
const wordOption = (interaction) => {
  const word = cleanWord(interaction.options.getString("word", true));
  if (!word) {
    reply(
      interaction,
      "That has to be one word of letters (2–32), with an optional * at the end.",
    );
  }
  return word;
};

const addWord = async ({ interaction }) => {
  if (!interaction.inGuild()) return notInGuild(interaction);
  const word = wordOption(interaction);
  if (!word) return;
  try {
    const guildId = interaction.guildId;
    const doc = await BlockedWords.findOne({ guildId }).lean();

    if (DEFAULT_WORDS.includes(word)) {
      if (!doc?.removed.includes(word)) {
        return reply(interaction, `${shown(word)} is already blocked.`);
      }
      await BlockedWords.updateOne({ guildId }, { $pull: { removed: word } });
      return reply(interaction, `${shown(word)} is blocked again.`);
    }

    if (doc?.added.includes(word)) {
      return reply(interaction, `${shown(word)} is already blocked.`);
    }
    if ((doc?.added.length ?? 0) >= MAX_ADDED) {
      return reply(
        interaction,
        `This server already has ${MAX_ADDED} words of its own. Remove one first.`,
      );
    }
    await BlockedWords.updateOne(
      { guildId },
      { $addToSet: { added: word } },
      { upsert: true },
    );
    return reply(interaction, `${shown(word)} is blocked in confessions now.`);
  } catch (err) {
    logger.error("confessions words add error:", err);
    return reply(interaction, "Failed to save the word.");
  }
};

const removeWord = async ({ interaction }) => {
  if (!interaction.inGuild()) return notInGuild(interaction);
  const word = wordOption(interaction);
  if (!word) return;
  try {
    const guildId = interaction.guildId;
    const doc = await BlockedWords.findOne({ guildId }).lean();

    if (doc?.added.includes(word)) {
      await BlockedWords.updateOne({ guildId }, { $pull: { added: word } });
      return reply(interaction, `${shown(word)} isn't blocked anymore.`);
    }
    if (DEFAULT_WORDS.includes(word) && !doc?.removed.includes(word)) {
      await BlockedWords.updateOne(
        { guildId },
        { $addToSet: { removed: word } },
        { upsert: true },
      );
      return reply(
        interaction,
        `${shown(word)} isn't blocked anymore. \`/confessions words add\` brings it back.`,
      );
    }
    if (doc?.removed.includes(word)) {
      return reply(interaction, `${shown(word)} is already turned off.`);
    }
    return reply(interaction, `${shown(word)} isn't on the list.`);
  } catch (err) {
    logger.error("confessions words remove error:", err);
    return reply(interaction, "Failed to save the change.");
  }
};

const listWords = async ({ interaction }) => {
  if (!interaction.inGuild()) return notInGuild(interaction);
  try {
    const doc = await BlockedWords.findOne({
      guildId: interaction.guildId,
    }).lean();
    const removed = doc?.removed ?? [];
    const added = doc?.added ?? [];

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle("Words blocked in confessions")
      .addFields(
        {
          name: "Default",
          value: spoiler(DEFAULT_WORDS.filter((w) => !removed.includes(w))),
        },
        { name: "Added here", value: spoiler(added) },
        { name: "Defaults turned off", value: spoiler(removed) },
      )
      .setFooter({ text: "a word ending in * also blocks longer words" });

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error("confessions words list error:", err);
    return reply(interaction, "Failed to load the words.");
  }
};

module.exports = {
  data,
  subcommands: {
    setup,
    disable,
    words: { add: addWord, remove: removeWord, list: listWords },
  },
};
