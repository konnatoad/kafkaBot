const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require("discord.js");
const NotificationConfig = require("../../../../schemas/NotificationConfig");
const logger = require("../../../../extra/logger");

async function run({ interaction }) {
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
    logger.error("notification-remove failed:", error);
    return interaction.editReply(
      "There was a database error. Please try again later.",
    );
  }
}

const data = new SlashCommandBuilder()
  .setName("notification-remove")
  .setDescription("Turn off youtube notifications for a channel.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true),
  );

module.exports = { data, run };
