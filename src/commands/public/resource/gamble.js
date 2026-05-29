const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");

module.exports = {
  deleted: false,
  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "you can only run this command inside a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const amount = interaction.options.getNumber("amount");
    const allIn = interaction.options.getBoolean("all-in");
    const query = { userId: interaction.user.id, Guild: interaction.guild.id };

    const riggedId = process.env.RIGGED_USER_ID;
    const winChance = riggedId && interaction.user.id === riggedId ? 0.75 : 0.45;
    const isJackpot = Math.random() < 0.001;
    const didWin = isJackpot || Math.random() < winChance;

    let bet;

    if (allIn) {
      // Atomically zero the balance and capture the old value as the bet
      const old = await UserProfile.findOneAndUpdate(
        { ...query, balance: { $gt: 0 } },
        { $set: { balance: 0 } },
        { returnDocument: 'before' }
      );
      if (!old) {
        const exists = await UserProfile.exists(query);
        if (!exists) {
          return interaction.reply(
            "You don't have user setup in my database, please run /daily."
          );
        }
        return interaction.reply("You have no rice grains to gamble.");
      }
      bet = old.balance;
    } else {
      if (amount < 10) {
        return interaction.reply("You must gamble at least 10 rice grains.");
      }
      // Atomically deduct only if balance is sufficient
      const updated = await UserProfile.findOneAndUpdate(
        { ...query, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { returnDocument: 'after' }
      );
      if (!updated) {
        const exists = await UserProfile.exists(query);
        if (!exists) {
          return interaction.reply(
            "You don't have user setup in my database, please run /daily."
          );
        }
        return interaction.reply("You don't have enough balance to gamble.");
      }
      bet = amount;
    }

    if (!didWin) {
      const lossoptios = [
        "Oh would you look at that, you lost! Better luck next time!",
        "Next time you lose I'll make you my pet, so please do try again!",
        "You suck at this.",
        "You really should stop gambling. It's not really going too well for you is it?",
        "You're so bad at this.",
        "Maybe it's time to quit before you go bankrupt.",
      ];
      return interaction.reply({
        content: lossoptios[Math.floor(Math.random() * lossoptios.length)],
      });
    }

    const multiplier = isJackpot ? 10 : Math.random() * 1.8 + 1.2;
    const amountWon = Math.max(bet + 1, Number((bet * multiplier).toFixed(0)));
    const result = await UserProfile.findOneAndUpdate(
      query,
      { $inc: { balance: amountWon } },
      { returnDocument: 'after' }
    );

    if (isJackpot) {
      return interaction.reply(
        `Ugh. JACKPOT. Of all the people, it had to be you. Don't let it get to your head. +${amountWon} rice grains!\nYour new balance is: ${result.balance} grains`
      );
    }

    return interaction.reply(
      `Congratulations! You won +${amountWon} rice grains!\nYour new balance is: ${result.balance} grains`
    );
  },

  data: new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("Gamble some of your rice grains.")
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount you want to gamble.")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("all-in")
        .setDescription("Gamble your entire balance.")
        .setRequired(false)
    ),
};
