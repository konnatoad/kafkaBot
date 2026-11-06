const { ChannelType, EmbedBuilder, MessageFlags } = require("discord.js");
const NotificationConfig = require("../schemas/NotificationConfig");
const logger = require("../extra/logger");
const {
  findChannel,
  latestUpload,
  describeApiError,
} = require("../utils/youtube");

const subcommandGroup = (group) =>
  group
    .setName("youtube")
    .setDescription("YouTube upload notifications")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Setup youtube notifications for a channel")
        .addStringOption((option) =>
          option
            .setName("youtube-id")
            .setDescription("The ID of the youtube channel")
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("target-channel")
            .setDescription("The channel to get notifications in")
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement,
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("custom-message")
            .setDescription(
              "Templates: {VIDEO_TITLE} {VIDEO_URL} {CHANNEL_NAME} {CHANNEL_URL}",
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Turn off youtube notifications for a channel.")
        .addStringOption((option) =>
          option
            .setName("youtube-id")
            .setDescription("The ID of the target youtube channel.")
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("target-channel")
            .setDescription("The channel to turn off notifications for.")
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement,
            )
            .setRequired(true),
        ),
    );

async function add({ interaction }) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const ytChannelId = interaction.options.getString("youtube-id").trim();
  const notificationChannel = interaction.options.getChannel("target-channel");

  try {
    if (
      await NotificationConfig.exists({
        guildId: interaction.guildId,
        ytChannelId,
      })
    ) {
      return interaction.editReply(
        "That YouTube channel has already been configured for notifications in this guild.",
      );
    }

    let channel;
    let latest;
    try {
      channel = await findChannel(ytChannelId);
      // remembered now, so the check only announces uploads after this point
      latest = channel && (await latestUpload(ytChannelId));
    } catch (error) {
      logger.warn(
        `notify youtube add: YouTube lookup failed: ${describeApiError(error)}`,
      );
      return interaction.editReply(
        "Couldn't reach YouTube. Try again in a bit.",
      );
    }
    if (!channel) {
      return interaction.editReply(
        "There was an error fetching the channel. Ensure the ID is correct.",
      );
    }

    await NotificationConfig.create({
      guildId: interaction.guildId,
      notificationChannelId: notificationChannel.id,
      ytChannelId,
      customMessage: interaction.options.getString("custom-message"),
      lastChecked: new Date(),
      lastCheckedVid: latest
        ? { id: latest.id, pubDate: latest.pubDate }
        : null,
    });

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("Youtube channel configuration success!")
      .setDescription(
        `${notificationChannel} will now get notified whenever there's a new upload by ${channel.title}`,
      )
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error("notify youtube add failed:", error);
    return interaction.editReply(
      "Unexpected database error. Please try again in a moment.",
    );
  }
}

async function remove({ interaction }) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const removed = await NotificationConfig.findOneAndDelete({
      guildId: interaction.guildId,
      ytChannelId: interaction.options.getString("youtube-id").trim(),
      notificationChannelId:
        interaction.options.getChannel("target-channel").id,
    });
    return interaction.editReply(
      removed
        ? "Turned off notifications for that channel!"
        : "That youtube channel has not been configured for notifications.",
    );
  } catch (error) {
    logger.error("notify youtube remove failed:", error);
    return interaction.editReply(
      "There was a database error. Please try again later.",
    );
  }
}

module.exports = { subcommandGroup, add, remove };
