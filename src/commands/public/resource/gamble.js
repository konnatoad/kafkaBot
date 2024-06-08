const { SlashCommandBuilder } = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");

module.exports = {
  deleted: false,
  run: async ({ interaction }) => {
    try {
      if (!interaction.inGuild()) {
        return interaction.reply({
          content: "You can only run this command inside a server.",
          ephemeral: true,
        });
      }

      const amount = interaction.options.getNumber("amount");

      if (amount < 10) {
        return interaction.reply("You must gamble at least 10 rice grains.");
      }

      const userProfile = await UserProfile.findOneAndUpdate(
        { userId: interaction.user.id, Guild: interaction.guildId },
        { $inc: { balance: -amount } },
        { new: true, upsert: true }
      );

      if (amount > userProfile.balance) {
        return interaction.reply("You don't have enough balance to gamble.");
      }

      const didWin = Math.random() > 0.65;

      if (!didWin) {
        const lossoptios = [
          "Oh would you look at that, you lost! Better luck next time!",
          "Next time you lose I'll make you my pet, so please do try again!",
        ];

        return interaction.reply(
          lossoptios[Math.floor(Math.random() * lossoptios.length)]
        );
      }

      const amountWon = Math.round(amount * (Math.random() + 0.55));
      userProfile.balance += amountWon;
      await userProfile.save();

      return interaction.reply(
        `Congratulations! You won +${amountWon} rice grains!\nYour new balance is: ${userProfile.balance} grains`
      );
    } catch (error) {
      console.error(`Error processing gamble command: ${error}`);
      return interaction.reply({
        content: "An error occurred while processing your request.",
        ephemeral: true,
      });
    }
  },

  data: new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("Gamble some of your rice grains.")
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount you want to gamble.")
        .setRequired(true)
    ),
};
