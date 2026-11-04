// The deleted-message log and the edited-message log: one command shape and one
// way of posting, each with its own collection and embed.
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const logger = require("../extra/logger");

// messages in this channel are never logged
const UNLOGGED_CHANNEL = "895273892120252437";
// Discord rejects the whole embed when one field value is over 1024 characters
const FIELD_LIMIT = 1024;

function fieldValue(text) {
  return text.length <= FIELD_LIMIT
    ? text
    : `${text.slice(0, FIELD_LIMIT - 1)}…`;
}

const quoted = (content) => fieldValue(`> ${content || "no message content"}`);

/** True for messages a log should skip: DMs, bots, uncached authors. */
function isUnloggable(message) {
  return (
    !message.guild ||
    !message.author ||
    message.author.bot ||
    message.channelId === UNLOGGED_CHANNEL
  );
}

/** Builds the log embed around `fields` and posts it to the guild's log channel, if set up. */
async function postToLog(
  model,
  message,
  { title, description, fields, footer },
) {
  const setup = await model.findOne({ Guild: message.guild.id });
  if (!setup) return;

  const channel = await message.guild.channels
    .fetch(setup.Channel)
    .catch(() => null);
  if (!channel) {
    logger.warn(
      `${footer}: log channel ${setup.Channel} is gone in guild ${message.guild.id}`,
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle(title)
    .setDescription(description)
    .addFields(
      ...fields,
      {
        name: "Message Author",
        value: `> \`${message.author.username} (${message.author.id})\``,
      },
      {
        name: "Message Channel",
        value: `> ${message.channel} (${message.channel.id})`,
      },
    )
    .setFooter({ text: footer, iconURL: "https://vou.s-ul.eu/ts9RQjxl" })
    .setTimestamp();

  const attachments = message.attachments.map((attachment) => attachment.url);
  if (attachments.length) {
    embed.addFields({
      name: "Message attachments",
      value: fieldValue(attachments.join(" , ")),
    });
  }

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error(
      `${footer}: failed to post in guild ${message.guild.id}:`,
      err,
    );
  }
}

/** The ephemeral embed every `/message-log` subcommand answers with. */
const reply = (interaction, text) =>
  interaction.reply({
    embeds: [new EmbedBuilder().setColor("Blurple").setDescription(text)],
    flags: MessageFlags.Ephemeral,
  });

/** What `setup <channel>` and `disable` run for the log kept in `model`. */
function logChannelSubcommands(model) {
  const setup = async ({ interaction }) => {
    const guild = { Guild: interaction.guildId };
    if (await model.exists(guild)) {
      return reply(
        interaction,
        "Looks like you already have this system setup",
      );
    }
    const channel = interaction.options.getChannel("channel");
    await model.create({ ...guild, Channel: channel.id });
    return reply(
      interaction,
      `message logging system has been setup to channel ${channel}`,
    );
  };

  const disable = async ({ interaction }) => {
    const removed = await model.findOneAndDelete({
      Guild: interaction.guildId,
    });
    return reply(
      interaction,
      removed
        ? "message logging has been disabled!"
        : "this system has yet to be setup",
    );
  };

  return { setup, disable };
}

/** One command with a `setup <channel>` / `disable` group for each of `logs`. */
function logChannelCommand({ name, description, logs }) {
  const data = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  const subcommands = {};

  for (const { group, system, logged, model } of logs) {
    data.addSubcommandGroup((subcommandGroup) =>
      subcommandGroup
        .setName(group)
        .setDescription(`The ${system}`)
        .addSubcommand((command) =>
          command
            .setName("setup")
            .setDescription(`Setup the ${system} system`)
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription(`Channel to log ${logged} messages in to`)
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("disable")
            .setDescription(`disable the ${system} system`),
        ),
    );
    subcommands[group] = logChannelSubcommands(model);
  }

  return { data, subcommands };
}

module.exports = { isUnloggable, postToLog, quoted, logChannelCommand };
