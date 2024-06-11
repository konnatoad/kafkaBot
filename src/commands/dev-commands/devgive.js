const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const UserProfile = require("../../schemas/UserProfile");

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("devgive")
    .setDescription(
      "Developer-only command to give rice grains to another user"
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
    )
    .setDefaultPermission(false), // Hide the command by default
  devOnly: true, // Mark this command as developer-only
  run: async ({ interaction }) => {
    const receiver = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const guildId = interaction.guild.id;

    if (amount <= 0) {
      return interaction.reply({
        content: "You must specify a positive amount of rice grains.",
        ephemeral: true,
      });
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

    receiverProfile.balance += amount;

    await receiverProfile.save();

    const giverName = interaction.member.displayName; // Get the name of the developer
    return interaction.reply({
      content: `Hey ${receiver.toString()}, ${giverName} has generously given you ${amount} rice grains! Enjoy!`,
    });
  },
};
