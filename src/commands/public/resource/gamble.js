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

    let amount = interaction.options.getNumber("amount");
    const allIn = interaction.options.getBoolean("all-in");

    if (amount < 10) {
      interaction.reply("You must gamble at least 10 rice grains.");
      return;
    }

    let userProfile = await UserProfile.findOne({
      userId: interaction.user.id,
      Guild: interaction.guild.id,
    });

    if (!userProfile) {
      interaction.reply(
        "You don't have user setup in my database, please run /daily."
      );
      return;
    }

    if (allIn) {
      amount = userProfile.balance;
    }

    if (amount > userProfile.balance) {
      interaction.reply("You don't have enough balance to gamble.");
      return;
    }

    const RIGGED = "234523452345"
    let winChance = 0.55;

    if (interaction.user.id === RIGGED) {
      winChance = 0.25;
    }

    const didWin = Math.random() > winChance;

    if (!didWin) {
      userProfile.balance -= amount;
      await userProfile.save();
      //await interaction.deleteReply();

      const lossoptios = [
        "Oh would you look at that, you lost! Better luck next time!",
        "Next time you lose I'll make you my pet, so please do try again!",
        "You suck at this.",
        "You really should stop gambling. It's not really going too well for you is it?",
        "You're so bad at this.",
        "Maybe it's time to quit before you go bankrupt.",
      ];

      const randomreply =
        lossoptios[Math.floor(Math.random() * lossoptios.length)];

      await interaction.reply({
        content: `${randomreply}`,
      });
      return;
    }

    const amountWon = Number((amount * (Math.random() + 0.55)).toFixed(0));

    userProfile.balance += amountWon;
    await userProfile.save();

    await interaction.reply(
      `Congratulations! You won +${amountWon} rice grains!\nYour new balance is: ${userProfile.balance} grains`
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
