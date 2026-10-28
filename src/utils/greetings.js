// Welcome and goodbye messages work the same way, so both their events and their
// four commands each (setup, message, test, disable) are built from here.
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
  ChannelType,
} = require("discord.js");
const WelcomeSetup = require("../schemas/welcomeSchema");
const GoodbyeSetup = require("../schemas/goodbyeSchema");
const logger = require("../extra/logger");
const { alertMissingPermissions } = require("./permissionAlert");

const KINDS = {
  welcome: {
    label: "Welcome",
    model: WelcomeSetup,
    messageField: "welcomeMessage",
    embedTitle: "Welcome to server.",
    // the person who joined gets pinged above the embed
    mentionWithEmbed: true,
  },
  goodbye: {
    label: "Goodbye",
    model: GoodbyeSetup,
    messageField: "goodbyeMessage",
    embedTitle: "User left the server.",
    mentionWithEmbed: false,
  },
};

const PLACEHOLDERS =
  "{SERVER_MEMBER}, {SERVER_NAME}, {USER_MENTION}, {USER_NAME}";

const neededPermissions = (setup) =>
  setup.useEmbed
    ? ["ViewChannel", "SendMessages", "EmbedLinks"]
    : ["ViewChannel", "SendMessages"];

const readable = (permission) => permission.replace(/([a-z])([A-Z])/g, "$1 $2");

function fillPlaceholders(template, member) {
  return template
    .replaceAll("{SERVER_MEMBER}", String(member.guild.memberCount))
    .replaceAll("{USER_MENTION}", `<@${member.id}>`)
    .replaceAll("{USER_NAME}", member.user.username)
    .replaceAll("{SERVER_NAME}", member.guild.name);
}

function greetingMessage(kind, setup, member) {
  const text = fillPlaceholders(setup[KINDS[kind].messageField], member);
  if (!setup.useEmbed) return text;

  const embed = new EmbedBuilder()
    .setColor("Random")
    .setTitle(KINDS[kind].embedTitle)
    .setThumbnail(member.user.displayAvatarURL())
    .setDescription(text)
    .setTimestamp();
  return {
    content: KINDS[kind].mentionWithEmbed ? `<@${member.id}>` : undefined,
    embeds: [embed],
  };
}

/** Sends `kind`'s message for `member`, the way guildMemberAdd/Remove do. */
async function greet(kind, member) {
  const where = `guild "${member.guild.name}" (${member.guild.id})`;
  try {
    const setup = await KINDS[kind].model.findOne({ guildId: member.guild.id });
    if (!setup) return;

    const channel = member.guild.channels.cache.get(setup.channelId);
    if (!channel) {
      logger.warn(`${kind}: channel ${setup.channelId} is gone in ${where}`);
      return;
    }

    const needed = neededPermissions(setup);
    const missing =
      channel.permissionsFor(member.guild.members.me)?.missing(needed) ??
      needed;
    if (missing.length) {
      await alertMissingPermissions(member.guild, channel, missing, kind).catch(
        (err) =>
          logger.error(`${kind}: permission alert crashed in ${where}: ${err}`),
      );
      return;
    }

    await channel.send(greetingMessage(kind, setup, member));
  } catch (err) {
    logger.error(`${kind}: failed in ${where}: ${err}`);
  }
}

const ephemeral = (content) => ({ content, flags: MessageFlags.Ephemeral });

function setupCommand(kind) {
  const { model, label } = KINDS[kind];
  return {
    data: new SlashCommandBuilder()
      .setName(`${kind}-setup`)
      .setDescription(`Setup the ${kind} message for your server`)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription(`The channel where the ${kind} message will be sent`)
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true),
      ),

    run: async ({ interaction }) => {
      const channel = interaction.options.getChannel("channel", true);
      try {
        const missing = channel
          .permissionsFor(interaction.guild.members.me)
          ?.missing(["ViewChannel", "SendMessages"]);
        if (missing?.length) {
          return interaction.reply(
            ephemeral(
              `I can't post in ${channel}: I'm missing **${missing.map(readable).join(", ")}** there.`,
            ),
          );
        }

        if (await model.exists({ guildId: interaction.guildId })) {
          return interaction.reply(
            ephemeral(
              `The ${kind} message is already set up. Use \`/${kind}-disable\` first to move it.`,
            ),
          );
        }
        await model.create({
          guildId: interaction.guildId,
          channelId: channel.id,
        });

        const embed = new EmbedBuilder()
          .setColor("Random")
          .setDescription(
            `${label} setup completed. ${label} messages will be sent to ${channel}.`,
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      } catch (error) {
        logger.error(
          `${kind}-setup failed in guild ${interaction.guildId}:`,
          error,
        );
        return interaction.reply(
          ephemeral(`Couldn't save the ${kind} setup, try again.`),
        );
      }
    },
  };
}

function messageCommand(kind) {
  const { model, messageField } = KINDS[kind];
  return {
    data: new SlashCommandBuilder()
      .setName(`${kind}-message`)
      .setDescription(
        kind === "welcome"
          ? "Set the welcome message for new members"
          : "Set the goodbye message for members who leave",
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption((option) =>
        option
          .setName("message")
          .setDescription(`Variables ${PLACEHOLDERS}`)
          .setRequired(true),
      )
      .addBooleanOption((option) =>
        option
          .setName("use_embed")
          .setDescription(`Use an embed for the ${kind} message`)
          .setRequired(false),
      ),

    run: async ({ interaction }) => {
      const updated = await model.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          [messageField]: interaction.options.getString("message"),
          useEmbed: interaction.options.getBoolean("use_embed") ?? false,
        },
      );
      return interaction.reply(
        ephemeral(
          updated
            ? `Custom ${kind} message set successfully.`
            : `Please setup the ${kind} system first using \`/${kind}-setup\`.`,
        ),
      );
    },
  };
}

function testCommand(kind) {
  const { model, label } = KINDS[kind];
  return {
    data: new SlashCommandBuilder()
      .setName(`${kind}-test`)
      .setDescription(`Test the ${kind} message for the server.`)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // sends exactly what a real join or leave would, with you as the member
    run: async ({ interaction }) => {
      const setup = await model.findOne({ guildId: interaction.guildId });
      if (!setup) {
        return interaction.reply(
          ephemeral(`No ${kind} setup found for this server.`),
        );
      }
      const channel = interaction.guild.channels.cache.get(setup.channelId);
      if (!channel) {
        return interaction.reply(
          ephemeral(`The configured ${kind} channel does not exist.`),
        );
      }

      const needed = neededPermissions(setup);
      const missing =
        channel.permissionsFor(interaction.guild.members.me)?.missing(needed) ??
        needed;
      if (missing.length) {
        return interaction.reply(
          ephemeral(
            `I'm missing permissions in ${channel}. I need: ${missing.map(readable).join(", ")}.`,
          ),
        );
      }

      try {
        await channel.send(greetingMessage(kind, setup, interaction.member));
      } catch (error) {
        logger.error(
          `${kind}-test failed to send in guild "${interaction.guild.name}" (${interaction.guildId}), channel ${channel.id}: ${error}`,
        );
        return interaction.reply(
          ephemeral(
            "Couldn't send the test message. Check my permissions in that channel.",
          ),
        );
      }
      return interaction.reply(
        ephemeral(`${label} message sent successfully! ${channel}`),
      );
    },
  };
}

function disableCommand(kind) {
  const { model } = KINDS[kind];
  return {
    data: new SlashCommandBuilder()
      .setName(`${kind}-disable`)
      .setDescription(`Disable the ${kind} message feature`)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    run: async ({ interaction }) => {
      const deleted = await model.findOneAndDelete({
        guildId: interaction.guildId,
      });
      if (!deleted) {
        return interaction.reply(
          ephemeral(`No ${kind} setup found for this server.`),
        );
      }
      return interaction.reply(`The ${kind} message has been disabled.`);
    },
  };
}

module.exports = {
  greet,
  setupCommand,
  messageCommand,
  testCommand,
  disableCommand,
};
