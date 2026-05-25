const {
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");
const NotificationConfig = require("../../../../schemas/NotificationConfig");
const axios = require("axios");

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

async function run({ interaction }) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetYtChannelId = interaction.options.getString("youtube-id");
    const targetNotificationChannel =
      interaction.options.getChannel("target-channel");
    const targetCustomMessage = interaction.options.getString("custom-message");

    const duplicateExists = await NotificationConfig.exists({
      guildId: interaction.guildId,
      ytChannelId: targetYtChannelId
    });

    if (duplicateExists) {
      await interaction.followUp(
        "That YouTube channel has already been configured for notifications in this guild."
      );
      return;
    }

    const channelRes = await axios
      .get(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${targetYtChannelId}&key=${YOUTUBE_API_KEY}`)
      .catch(() => null);

    const channelData = channelRes?.data?.items?.[0];
    if (!channelData) {
      await interaction.followUp("There was an error fetching the channel. Ensure the ID is correct.");
      return;
    }

    const channelName = channelData.snippet.title;

    const notificationConfig = new NotificationConfig({
      guildId: interaction.guildId,
      notificationChannelId: targetNotificationChannel.id,
      ytChannelId: targetYtChannelId,
      customMessage: targetCustomMessage,
      lastChecked: new Date(),
      lastCheckedVid: null
    });

    const playlistId = "UU" + targetYtChannelId.slice(2);
    const videosRes = await axios
      .get(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=1&key=${YOUTUBE_API_KEY}`)
      .catch(() => null);

    const latestItem = videosRes?.data?.items?.[0];
    if (latestItem) {
      notificationConfig.lastCheckedVid = {
        id: latestItem.snippet.resourceId.videoId,
        pubDate: latestItem.snippet.publishedAt
      };
    }

    try {
      await notificationConfig.save();
    } catch {
      await interaction.followUp("Unexpected database error. Please try again in a moment.");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("Youtube channel configuration success!")
      .setDescription(
        `${targetNotificationChannel} will now get notified whenever there's a new upload by ${channelName}`
      )
      .setTimestamp();

    await interaction.followUp({ embeds: [embed] });
  } catch (error) {
    console.error(`error in ${__filename}:\n`, error);
  }
}

const data = new SlashCommandBuilder()
  .setName("notification-setup")
  .setDescription("Setup youtube notifications for a channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((option) =>
    option
      .setName("youtube-id")
      .setDescription("The ID of the youtube channel")
      .setRequired(true)
  )
  .addChannelOption((option) =>
    option
      .setName("target-channel")
      .setDescription("The channel to get notifications in")
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("custom-message")
      .setDescription(
        "Templates: {VIDEO_TITLE} {VIDEO_URL} {CHANNEL_NAME} {CHANNEL_URL}"
      )
  );

module.exports = { data, run, deleted: false };
