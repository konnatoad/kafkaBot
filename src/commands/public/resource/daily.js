const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");

const baseDailyAmount = 10;
const maxDailyAmount = 100;
const dailyIncrement = 5;

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Collect your dailies!"),

  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "This command can only be executed inside a server",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      await interaction.deferReply();

      const { default: prettyMs } = await import("pretty-ms");

      let userProfile = await UserProfile.findOne({
        userId: interaction.member.id,
        Guild: interaction.guild.id
      });

      const now = new Date();
      const nextReset = new Date(now.getTime());

      nextReset.setHours(24, 0, 0, 0);

      let remaining = nextReset.getTime() - now.getTime();
      if (remaining < 0) remaining = 0;

      const dailies = [
        `You have already collected your dailies today.\nCome back in **${prettyMs(remaining, { unitCount: 2 })}**.`,
        `Hey don't get too greedy!\nCome back in **${prettyMs(remaining, { unitCount: 2 })}**.`,
        `You know, they're called dailies for a reason. That means you can only get them once per day.\nTry again in **${prettyMs(remaining, { unitCount: 2 })}**.`,
        `Did you forget, you already claimed that today. \nCome back in **${prettyMs(remaining, { unitCount: 2 })}**.`,
        `You can't just collect dailies whenever you want. That's not how it works \nCome back in **${prettyMs(remaining, { unitCount: 2 })}**.`
      ];
      const dailycooldown = dailies[Math.floor(Math.random() * dailies.length)];

      if (userProfile) {
        const lastDailyDate = userProfile.lastDailyCollected?.toString();
        const currentDate = new Date().toLocaleDateString("fi-FI");

        if (lastDailyDate === currentDate) {
          interaction.editReply({
            content: `${dailycooldown}`
          });
          return;
        }

        // Handle streak calculation
        const lastCollectedDate = lastDailyDate
          ? new Date(lastDailyDate.split(".").reverse().join("-"))
          : null;
        const previousDay = new Date();
        previousDay.setDate(previousDay.getDate() - 1);

        if (
          lastCollectedDate &&
          lastCollectedDate.toLocaleDateString("fi-FI") ===
          previousDay.toLocaleDateString("fi-FI")
        ) {
          userProfile.dailyStreak = (userProfile.dailyStreak || 0) + 1;
        } else {
          userProfile.dailyStreak = 0;
        }
      } else {
        userProfile = new UserProfile({
          userId: interaction.member.id,
          Guild: interaction.guild.id,
          balance: 0,
          dailyStreak: 0 // Initialize streak if it's a new profile
        });
      }

      // Calculate daily reward based on streak
      let dailyAmount =
        baseDailyAmount + userProfile.dailyStreak * dailyIncrement;
      if (dailyAmount > maxDailyAmount) {
        dailyAmount = maxDailyAmount;
      }

      userProfile.balance += dailyAmount;
      userProfile.lastDailyCollected = new Date().toLocaleDateString("fi-FI");

      await userProfile.save();

      interaction.editReply({
        content: `${dailyAmount} was added to your balance.\nNew balance: ${userProfile.balance} rice grains\nStreak: ${userProfile.dailyStreak} days`
      });
    } catch (error) {
      console.error(`Error handling /daily: ${error}`);
    }
  }
};
