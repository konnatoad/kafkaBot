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

    // Atomically deduct from giver only if they have sufficient balance
    const giverProfile = await UserProfile.findOneAndUpdate(
      { userId: giver.id, Guild: guildId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { returnDocument: 'after' }
    );

    if (!giverProfile) {
      return interaction.reply("You do not have enough rice grains.");
    }

    // Atomically credit receiver, creating their profile if needed
    await UserProfile.findOneAndUpdate(
      { userId: receiver.id, Guild: guildId },
      { $inc: { balance: amount } },
      { upsert: true }
    );

    return interaction.reply({
      content: `${giver.toString()} has given ${amount} rice grains to ${receiver.toString()}!`,
    });
  },
};
