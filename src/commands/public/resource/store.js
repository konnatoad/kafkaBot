const { SlashCommandBuilder } = require("discord.js");
const StoreItem = require("../../../schemas/Store");
const UserProfile = require("../../../schemas/UserProfile");

async function removeBalance(userId, amount) {
  try {
    const userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      throw new Error("User profile not found.");
    }

    userProfile.balance -= amount;
    await userProfile.save();

    return true; // Indicate successful deduction
  } catch (error) {
    console.error("Error removing balance:", error.message);
    return false; // Indicate failure to deduct balance
  }
}

async function getUserBalance(userId) {
  try {
    const userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      throw new Error("User profile not found.");
    }

    return userProfile.balance;
  } catch (error) {
    console.error("Error retrieving user balance:", error.message);
    return 0; // Return 0 balance if an error occurs
  }
}

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("buy-role")
    .setDescription("Buy a role from the rice grains store")
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("The role you want to buy")
        .setRequired(true)
    ),
  run: async ({ interaction }) => {
    const roleToBuyId = interaction.options.getRole("role").id;
    const userId = interaction.user.id;
    const guildId = interaction.guild.id; // Get the guild ID

    // Find the role in the store
    const storeItem = await StoreItem.findOne({ guildId, roleId: roleToBuyId });
    if (!storeItem) {
      return interaction.reply("This role is not available for purchase.");
    }

    const userBalance = await getUserBalance(userId);

    // Check if the user can afford the role
    if (userBalance < storeItem.cost) {
      return interaction.reply(
        "You do not have enough rice grains to buy this role."
      );
    }

    const balanceRemoved = await removeBalance(userId, storeItem.cost);
    if (!balanceRemoved) {
      return interaction.reply(
        "An error occurred while removing your balance."
      );
    }

    const member = await interaction.guild.members.fetch(userId);
    try {
      await member.roles.add(roleToBuyId);
      // Fetch the role object and mention it in the reply
      const roleToAdd = interaction.guild.roles.cache.get(roleToBuyId);
      return interaction.reply(
        `Congratulations! You have successfully purchased the ${roleToAdd.toString()} role.`
      );
    } catch (error) {
      if (error.message.includes("Missing Permissions")) {
        return interaction.reply(
          "I don't have permission to give you that role. Please contact a server administrator."
        );
      } else {
        console.error("Error adding role to user:", error.message);
        return interaction.reply(
          "An error occurred while giving you the role."
        );
      }
    }
  },
};
