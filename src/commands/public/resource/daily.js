const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");

const dailyAmount = 25;

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Collect your dailies!"),

  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "This command can only be executed inside a server",
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

      const dailies = [
        "You have already collected your dailies today. Come back tomorrow.",
        "Hey don't get too greedy! Come back tomorrow for more.",
        "You know, they're called dailies for a reason. That means you can only get them once per day. Try again tomorrow!",
        "Did you forget, you already claimed that today. Come back tomorrow!",
      ];
      const dailycooldown = dailies[Math.floor(Math.random() * dailies.length)];

      if (userProfile) {
        const lastDailyDate = userProfile.lastDailyCollected?.toString();
        const currentDate = new Date().toLocaleDateString("fi-FI");

        if (lastDailyDate === currentDate) {
          interaction.editReply({
            content: `${dailycooldown}`,
          });
          return;
        }
      } else {
        userProfile = new UserProfile({
          userId: interaction.member.id,
          Guild: interaction.guild.id,
        });
      }

      userProfile.balance += dailyAmount;
      userProfile.lastDailyCollected = new Date().toLocaleDateString("fi-FI");

      await userProfile.save();

      interaction.editReply({
        content: `${dailyAmount} was added to your balance.\nNew balance: ${userProfile.balance} rice grains`,
      });
    } catch (error) {
      console.log(`Error handling /daily: ${error}`);
    }
  },
};
