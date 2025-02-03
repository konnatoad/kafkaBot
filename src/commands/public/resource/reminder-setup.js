const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");

module.exports = {
  deleted: true, //change when done
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
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disable your daily reminder.")
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
      await interaction.deferReply();

      let userProfile = await UserProfile.findOne({
        userId: interaction.member.id,
        Guild: interaction.guild.id,
      });

      if (subcommand === "set") {
        const reminderTime = interaction.options.getString("time");

        const timeFormat = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeFormat.test(reminderTime)) {
          interaction.editReply({
            content: "Invalid time format. Please use HH:MM.",
          });
          return;
        }

        if (!userProfile) {
          userProfile = new UserProfile({
            userId: interaction.member.id,
            Guild: interaction.guild.id,
            balance: 0,
            dailyStreak: 0,
          });
        }

        userProfile.reminderTime = reminderTime;
        await userProfile.save();

        interaction.editReply({
          content: `Reminder set for ${reminderTime}.`,
        });
      } else if (subcommand === "disable") {
        if (!userProfile || !userProfile.reminderTime) {
          interaction.editReply({
            content: "You don't have a daily reminder set.",
          });
          return;
        }

        userProfile.reminderTime = null;
        await userProfile.save();

        interaction.editReply({
          content: "Your daily reminder has been disabled.",
        });
      }
    } catch (error) {
      console.error(error);
      interaction.editReply({
        content:
          "An error occurred while managing your reminder. Please try again later.",
      });
    }
  },
};
