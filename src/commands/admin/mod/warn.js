const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const {
  addWarning,
  findWarnings,
  clearWarnings,
} = require("../../../utils/warnings");
const logger = require("../../../extra/logger");

// embed descriptions stop at 4096 characters
const MAX_DESCRIPTION = 4000;

const data = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("Warn members, and see or clear their warnings")
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Warn a member")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user you want to warn")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Reason for the warning")
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("list")
      .setDescription("See a member's warnings")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user you want to check the warnings of")
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("clear")
      .setDescription("Clear all of a member's warnings")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user you want to clear the warnings of")
          .setRequired(true),
      ),
  );

// warnings belong to a server, so none of these work in DMs
const notInGuild = (interaction) =>
  interaction.reply({
    content: "Run this inside a server.",
    flags: MessageFlags.Ephemeral,
  });

const add = async ({ interaction }) => {
  if (!interaction.inGuild()) return notInGuild(interaction);
  const { options, guildId, user } = interaction;

  const target = options.getUser("user");
  const reason = options.getString("reason") || "No reason given";

  await addWarning({
    guildId,
    userId: target.id,
    userTag: target.username,
    executerId: user.id,
    executerTag: user.username,
    reason,
  });

  const dmEmbed = new EmbedBuilder()
    .setColor("Blurple")
    .setDescription(
      `:exclamation: You have been **warned** in ${interaction.guild.name} | ${reason}`,
    )
    .setTimestamp();
  target.send({ embeds: [dmEmbed] }).catch((err) => {
    if (err.code !== 50007) logger.error("warn: failed to DM user:", err);
  });

  const replyEmbed = new EmbedBuilder()
    .setColor("Blurple")
    .setDescription(
      `:exclamation: **${target}** has been **warned** | ${reason}`,
    )
    .setTimestamp();
  await interaction.reply({ embeds: [replyEmbed] });
};

const list = async ({ interaction }) => {
  if (!interaction.inGuild()) return notInGuild(interaction);
  const target = interaction.options.getUser("user");
  const warnings = await findWarnings(interaction.guildId, target.id);

  if (!warnings.length) {
    const noWarns = new EmbedBuilder()
      .setColor("Blurple")
      .setDescription(`:white_check_mark: **${target}** has **0** warnings!`)
      .setTimestamp();
    return interaction.reply({ embeds: [noWarns] });
  }

  let description = `:exclamation: ${target}'s warnings (${warnings.length}):\n`;
  for (const [i, warning] of warnings.entries()) {
    const line = `\n**${i + 1}.** ${warning.Reason}\n-# by ${warning.ExecuterTag}`;
    if (description.length + line.length > MAX_DESCRIPTION) {
      description += `\n\n…and ${warnings.length - i} more`;
      break;
    }
    description += line;
  }

  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: "Warnings", iconURL: "https://vou.s-ul.eu/ts9RQjxl" });
  await interaction.reply({ embeds: [embed] });
};

const clear = async ({ interaction }) => {
  if (!interaction.inGuild()) return notInGuild(interaction);
  const target = interaction.options.getUser("user");
  const cleared = await clearWarnings(interaction.guildId, target.id);

  if (!cleared) {
    return interaction.reply({
      content: `**${target}** has no warnings to be cleared`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setDescription(
      `:white_check_mark: **${target}'s** ${cleared} warning(s) have been cleared`,
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
};

module.exports = { data, subcommands: { add, list, clear } };
