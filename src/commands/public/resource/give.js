const { SlashCommandBuilder } = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("give")
    .setDescription("Give your rice grains to another user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to give rice grains to")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount of rice grains to give")
        .setRequired(true)
    ),
  run: async ({ interaction }) => {
    const giver = interaction.user;
    const receiver = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const guildId = interaction.guildId;

    if (giver.id === receiver.id) {
      return interaction.reply("You cannot give rice grains to yourself!");
    }

    if (amount <= 0) {
      return interaction.reply("Stealing is illegal!");
    }

    let giverProfile = await UserProfile.findOne({
      userId: giver.id,
      Guild: guildId,
    });
    if (!giverProfile) {
      giverProfile = new UserProfile({
        userId: giver.id,
        Guild: guildId,
        balance: 0,
      });
    }

    if (giverProfile.balance < amount) {
      return interaction.reply("You do not have enough rice grains.");
    }

    let receiverProfile = await UserProfile.findOne({
      userId: receiver.id,
      Guild: guildId,
    });
    if (!receiverProfile) {
      receiverProfile = new UserProfile({
        userId: receiver.id,
        Guild: guildId,
        balance: 0,
      });
    }

    giverProfile.balance -= amount;
    receiverProfile.balance += amount;

    await giverProfile.save();
    await receiverProfile.save();

    return interaction.reply({
      content: `${giver.toString()} has given ${amount} rice grains to ${receiver.toString()}!`,
    });
  },
};
