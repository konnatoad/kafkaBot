const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const UserProfile = require("../../schemas/UserProfile");

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("devremove")
    .setDescription(
      "Developer-only command to remove rice grains from another user"
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to remove rice grains from")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount of rice grains to remove")
        .setRequired(true)
    )
    .setDefaultPermission(false), // Hide the command by default
  devOnly: true, // Mark this command as developer-only
  run: async ({ interaction }) => {
    const receiver = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const guildId = interaction.guild.id;

    if (amount <= 0) {
      return interaction.reply({
        content: "You must specify a positive amount of rice grains to remove.",
        flags: MessageFlags.Ephemeral,
      });
    }

    let receiverProfile = await UserProfile.findOne({
      userId: receiver.id,
      Guild: guildId,
    });

    if (!receiverProfile) {
      return interaction.reply({
        content: "The specified user does not have a profile.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (receiverProfile.balance < amount) {
      return interaction.reply({
        content: `The specified user does not have enough rice grains. Their current balance is ${receiverProfile.balance}.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    receiverProfile.balance -= amount;

    await receiverProfile.save();

    return interaction.reply({
      content: `Successfully removed ${amount} rice grains from ${receiver.toString()}. Their new balance is ${
        receiverProfile.balance
      }.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
