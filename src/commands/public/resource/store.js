const { SlashCommandBuilder } = require("discord.js");
const StoreItem = require("../../../schemas/Store");
const UserProfile = require("../../../schemas/UserProfile");
const logger = require("../../../extra/logger");

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
    const guildId = interaction.guild.id;

    const storeItem = await StoreItem.findOne({ guildId, roleId: roleToBuyId });
    if (!storeItem) {
      return interaction.reply("This role is not available for purchase.");
    }

    // Atomically deduct cost only if the user has sufficient balance
    const updatedProfile = await UserProfile.findOneAndUpdate(
      { userId, Guild: guildId, balance: { $gte: storeItem.cost } },
      { $inc: { balance: -storeItem.cost } },
      { returnDocument: 'after' }
    );

    if (!updatedProfile) {
      return interaction.reply(
        "You do not have enough rice grains to buy this role."
      );
    }

    const member = await interaction.guild.members.fetch(userId);
    try {
      await member.roles.add(roleToBuyId);
      const roleToAdd = interaction.guild.roles.cache.get(roleToBuyId);
      return interaction.reply(
        `Congratulations! You have successfully purchased the ${roleToAdd.toString()} role.`
      );
    } catch (error) {
      // Refund the deducted balance since the role could not be granted
      await UserProfile.findOneAndUpdate(
        { userId, Guild: guildId },
        { $inc: { balance: storeItem.cost } }
      );

      if (error.message.includes("Missing Permissions")) {
        return interaction.reply(
          "I don't have permission to give you that role. Please contact a server administrator."
        );
      }

      logger.error("Error adding role to user:", error.message);
      return interaction.reply("An error occurred while giving you the role.");
    }
  }
};
