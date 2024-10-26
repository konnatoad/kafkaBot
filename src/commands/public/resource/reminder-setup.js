const { SlashCommandBuilder } = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");

module.exports = {
  deleted: true, //change when done
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set a reminder for dailies.")
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Time to remind you to do dailies.")
        .setRequired(true)
    ),

  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "This command can only be executed inside a server.",
        ephemeral: true,
      });
      return;
    }

    const reminderTime = interaction.options.getString("time");

    const timeFormat = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeFormat.test(reminderTime)) {
      interaction.reply({
        content: "Invalid time format. Please use HH:MM.",
        ephemeral: true,
      });
      return;
    }
    try {
      await interaction.deferReply();

      let userProfile = await UserProfile.findOne({
        userId: interaction.member.id,
        Guild: interaction.guild.id,
      });
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
    } catch (error) {
      console.error(error);
    }
  },
};
