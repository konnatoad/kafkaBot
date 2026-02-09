const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const Notification = require("../../../../schemas/twitchNotificationSchema");
const https = require("https");

const twitchNotificationCommand = new SlashCommandBuilder()
  .setName("twitchnotify")
  .setDescription("Setup or remove Twitch live notification system")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("setup")
      .setDescription("Setup Twitch live notification system")
      .addStringOption((option) =>
        option
          .setName("twitch_url")
          .setDescription("The URL of the Twitch channel")
          .setRequired(true)
      )
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("The channel to send notifications to")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("custom-message")
          .setDescription(
            "Use {URL} for Twitch channel URL and {USERNAME} for username."
          )
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Remove Twitch live notification setup")
      .addStringOption((option) =>
        option
          .setName("twitch_url")
          .setDescription("The URL of the Twitch channel")
          .setRequired(true)
      )
  );

module.exports = {
  deleted: false,
  data: twitchNotificationCommand,
  async run({ interaction }) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "setup") {
      // Setup Twitch notification
      await setupTwitchNotification(interaction);
    } else if (subcommand === "remove") {
      // Remove Twitch notification
      await removeTwitchNotification(interaction);
    }
  },
};

async function setupTwitchNotification(interaction) {
  const twitchUrl = interaction.options.getString("twitch_url");
  const customMessage =
    interaction.options.getString("custom-message") ||
    "@everyone {USERNAME} is now live on Twitch! Check it out: {URL}";
  const notificationChannel = interaction.options.getChannel("channel");

  // Extract Twitch username from the URL
  const twitchChannelMatch = twitchUrl.match(/\/([^\/]+)\/?$/);
  if (!twitchChannelMatch) {
    await interaction.followUp({
      content: "Invalid Twitch URL. Please provide a valid Twitch channel URL.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const twitchChannel = twitchChannelMatch[1];

  // Fetch Twitch data
  const userData = await fetchTwitchUserData(twitchChannel);

  if (!userData || !userData.id) {
    await interaction.followUp({
      content:
        "Failed to fetch Twitch user data. Please check the Twitch URL and try again.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check for existing notification in the same guild for the same Twitch channel
  const existingNotification = await Notification.findOne({
    guildId: interaction.guildId,
    twitchUsername: twitchChannel,
  });

  if (existingNotification) {
    await interaction.followUp({
      content: `A notification setup for ${twitchChannel} already exists in this guild.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    // Replace placeholders in the custom message
    const formattedCustomMessage = customMessage
      .replace("{USERNAME}", twitchChannel)
      .replace("{URL}", twitchUrl);

    // Save the setup to the database
    await Notification.create({
      guildId: interaction.guildId,
      twitchUsername: twitchChannel,
      twitchUserId: userData.id,
      customMessage: formattedCustomMessage,
      notificationChannelId: notificationChannel.id,
    });

    await interaction.followUp({
      content: `Notification system set up for ${twitchChannel} \nCustom message: ${formattedCustomMessage} \nNotifications will be sent to ${notificationChannel}.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error("Error setting up Twitch notification:", error);
    await interaction.followUp({
      content: "Failed to set up Twitch notification. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function removeTwitchNotification(interaction) {
  const twitchUrl = interaction.options.getString("twitch_url");

  // Fetch Twitch data to get the user ID
  const twitchChannel = twitchUrl.split("/").pop();
  const userData = await fetchTwitchUserData(twitchChannel);

  if (!userData || !userData.id) {
    await interaction.followUp({
      content:
        "Failed to fetch Twitch user data. Please check the Twitch URL and try again.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Find and delete the notification setup from the database
  try {
    const deletedNotification = await Notification.findOneAndDelete({
      guildId: interaction.guildId,
      twitchUsername: twitchChannel,
      twitchUserId: userData.id, // Ensure correct user ID
    });

    if (deletedNotification) {
      await interaction.followUp({
        content: `Twitch notification setup for ${twitchUrl} has been removed successfully.`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.followUp({
        content: `No Twitch notification setup found for ${twitchUrl}.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    console.error("Error removing Twitch notification setup:", error);
    await interaction.followUp({
      content:
        "Failed to remove Twitch notification setup. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function fetchTwitchUserData(userLogin) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.twitch.tv",
      path: `/helix/users?login=${userLogin}`,
      method: "GET",
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const userData = JSON.parse(data);
          resolve(userData.data[0]);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}
