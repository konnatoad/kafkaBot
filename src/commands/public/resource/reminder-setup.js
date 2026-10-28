const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");
const logger = require("../../../extra/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Manage your daily reminders.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Set a reminder for dailies.")
        .addStringOption((option) =>
          option
            .setName("time")
            .setDescription("Time to remind you to do dailies.")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disable your daily reminder."),
    ),

  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "This command can only be executed inside a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const owner = {
        userId: interaction.user.id,
        Guild: interaction.guild.id,
      };

      if (subcommand === "set") {
        const typed = interaction.options.getString("time").trim();
        const match = typed.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
        if (!match) {
          interaction.editReply("Invalid time format. Please use HH:MM.");
          return;
        }
        // saved as "08:30" because that's what the reminder check compares to
        const reminderTime = `${match[1].padStart(2, "0")}:${match[2]}`;

        await UserProfile.updateOne(
          owner,
          { $set: { reminderTime } },
          { upsert: true },
        );

        interaction.editReply(`Reminder set for ${reminderTime}.`);
      } else if (subcommand === "disable") {
        const cleared = await UserProfile.findOneAndUpdate(
          { ...owner, reminderTime: { $ne: null } },
          { $set: { reminderTime: null } },
        );
        if (!cleared) {
          interaction.editReply("You don't have a daily reminder set.");
          return;
        }

        interaction.editReply({
          content: "Your daily reminder has been disabled.",
        });
      }
    } catch (error) {
      logger.error(error);
      interaction.editReply({
        content:
          "An error occurred while managing your reminder. Please try again later.",
      });
    }
  },
};
