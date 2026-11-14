const { ChannelType, MessageFlags } = require("discord.js");
const Notification = require("../schemas/twitchNotificationSchema");
const logger = require("../extra/logger");
const { findUser, loginFromUrl } = require("../utils/twitch");

const DEFAULT_MESSAGE =
  "@everyone {USERNAME} is now live on Twitch! Check it out: {URL}";

const subcommandGroup = (group) =>
  group
    .setName("twitch")
    .setDescription("Twitch live notifications")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Setup Twitch live notification system")
        .addStringOption((option) =>
          option
            .setName("twitch_url")
            .setDescription("The URL of the Twitch channel")
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send notifications to")
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
              "Use {URL} for Twitch channel URL and {USERNAME} for username.",
            )
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove Twitch live notification setup")
        .addStringOption((option) =>
          option
            .setName("twitch_url")
            .setDescription("The URL of the Twitch channel")
            .setRequired(true),
        ),
    );

/** Finds the Twitch user behind the URL option, or replies and returns null. */
async function twitchUser(interaction) {
  const login = loginFromUrl(interaction.options.getString("twitch_url"));
  if (!login) {
    await interaction.editReply(
      "Invalid Twitch URL. Please provide a valid Twitch channel URL.",
    );
    return null;
  }

  let user;
  try {
    user = await findUser(login);
  } catch (error) {
    logger.error(
      "notify twitch: Twitch user lookup failed:",
      error.response?.data ?? error,
    );
    await interaction.editReply("Couldn't reach Twitch. Try again in a bit.");
    return null;
  }
  if (!user) {
    await interaction.editReply(`There's no Twitch channel called ${login}.`);
    return null;
  }
  return user;
}

async function add({ interaction }) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const user = await twitchUser(interaction);
  if (!user) return;

  // by user id: logins can be renamed and older setups saved them as typed
  const setup = { guildId: interaction.guildId, twitchUserId: user.id };

  try {
    if (await Notification.exists(setup)) {
      return interaction.editReply(
        `A notification setup for ${user.login} already exists in this guild.`,
      );
    }
    const channel = interaction.options.getChannel("channel");
    // placeholders stay in and are filled when the stream goes live
    const customMessage =
      interaction.options.getString("custom-message") || DEFAULT_MESSAGE;
    await Notification.create({
      ...setup,
      twitchUsername: user.login,
      customMessage,
      notificationChannelId: channel.id,
    });
    return interaction.editReply(
      `Notification system set up for ${user.login} \nCustom message: ${customMessage} \nNotifications will be sent to ${channel}.`,
    );
  } catch (error) {
    logger.error("notify twitch add: database error:", error);
    return interaction.editReply(
      "Failed to save the Twitch notification setup. Please try again later.",
    );
  }
}

async function remove({ interaction }) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const user = await twitchUser(interaction);
  if (!user) return;

  try {
    const removed = await Notification.findOneAndDelete({
      guildId: interaction.guildId,
      twitchUserId: user.id,
    });
    return interaction.editReply(
      removed
        ? `Twitch notification setup for ${user.login} has been removed successfully.`
        : `No Twitch notification setup found for ${user.login}.`,
    );
  } catch (error) {
    logger.error("notify twitch remove: database error:", error);
    return interaction.editReply(
      "Failed to save the Twitch notification setup. Please try again later.",
    );
  }
}

module.exports = { subcommandGroup, add, remove };
