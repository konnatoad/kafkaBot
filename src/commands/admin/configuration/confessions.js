const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require("discord.js");

const ConfessionConfig = require("../../../schemas/ConfessionConfig");
const logger = require("../../../extra/logger");

const data = new SlashCommandBuilder()
  .setName("confessions")
  .setDescription("Anonymous confessions in this server.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("setup")
      .setDescription("Set the channel where anonymous confessions are posted.")
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
      .setDescription("Disable anonymous confessions in this server."),
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

module.exports = { data, subcommands: { setup, disable } };
