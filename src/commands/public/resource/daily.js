const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");
const logger = require("../../../extra/logger");
const { pickOne } = require("../../../utils/random");

const baseDailyAmount = 10;
const maxDailyAmount = 100;
const dailyIncrement = 5;

const alreadyCollected = (wait) => [
  `You have already collected your dailies today.\nCome back in **${wait}**.`,
  `Hey don't get too greedy!\nCome back in **${wait}**.`,
  `You know, they're called dailies for a reason. That means you can only get them once per day.\nTry again in **${wait}**.`,
  `Did you forget, you already claimed that today. \nCome back in **${wait}**.`,
  `You can't just collect dailies whenever you want. That's not how it works \nCome back in **${wait}**.`,
];

// lastDailyCollected has always been stored as a Finnish date string, "28.10.2026"
const dayString = (date) => date.toLocaleDateString("fi-FI");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Collect your dailies!"),

  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "This command can only be executed inside a server",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await interaction.deferReply();
      const { default: prettyMs } = await import("pretty-ms");

      const now = new Date();
      const today = dayString(now);
      const dayBefore = new Date(now);
      dayBefore.setDate(now.getDate() - 1);
      const yesterday = dayString(dayBefore);
      const owner = {
        userId: interaction.user.id,
        Guild: interaction.guild.id,
      };

      const replyAlreadyCollected = () => {
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const wait = prettyMs(midnight - now, { unitCount: 2 });
        return interaction.editReply(pickOne(alreadyCollected(wait)));
      };

      const profile = await UserProfile.findOne(owner);
      const lastCollected = profile?.lastDailyCollected ?? null;
      if (lastCollected === today) return replyAlreadyCollected();

      const dailyStreak =
        lastCollected === yesterday ? (profile.dailyStreak || 0) + 1 : 0;
      const dailyAmount = Math.min(
        baseDailyAmount + dailyStreak * dailyIncrement,
        maxDailyAmount,
      );

      // Only matches while lastDailyCollected is still what we just read, so a
      // second click racing this one can't collect twice. With no profile yet the
      // upsert creates it, and a racing click hits the unique index instead.
      let updated;
      try {
        updated = await UserProfile.findOneAndUpdate(
          { ...owner, lastDailyCollected: lastCollected },
          {
            $set: { lastDailyCollected: today, dailyStreak },
            $inc: { balance: dailyAmount },
          },
          { upsert: true, returnDocument: "after" },
        );
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
      if (!updated) return replyAlreadyCollected();

      await interaction.editReply(
        `${dailyAmount} was added to your balance.\nNew balance: ${updated.balance} rice grains\nStreak: ${dailyStreak} days`,
      );
    } catch (error) {
      logger.error(`Error handling /daily: ${error}`);
      await interaction.editReply(
        "Something went wrong. Please try again later.",
      );
    }
  },
};
