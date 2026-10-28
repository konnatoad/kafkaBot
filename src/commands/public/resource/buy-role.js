const { SlashCommandBuilder } = require("discord.js");
const StoreItem = require("../../../schemas/Store");
const UserProfile = require("../../../schemas/UserProfile");
const logger = require("../../../extra/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buy-role")
    .setDescription("Buy a role from the rice grains store")
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("The role you want to buy")
        .setRequired(true),
    ),
  run: async ({ interaction }) => {
    const role = interaction.options.getRole("role");
    const owner = { userId: interaction.user.id, Guild: interaction.guild.id };

    const storeItem = await StoreItem.findOne({
      guildId: interaction.guild.id,
      roleId: role.id,
    });
    if (!storeItem) {
      return interaction.reply("This role is not available for purchase.");
    }
    if (interaction.member.roles.cache.has(role.id)) {
      return interaction.reply(`You already have the ${role} role.`);
    }

    // takes the cost only if they have it at the moment it's taken
    const paid = await UserProfile.findOneAndUpdate(
      { ...owner, balance: { $gte: storeItem.cost } },
      { $inc: { balance: -storeItem.cost } },
    );
    if (!paid) {
      return interaction.reply(
        "You do not have enough rice grains to buy this role.",
      );
    }

    try {
      await interaction.member.roles.add(role.id);
    } catch (error) {
      await UserProfile.updateOne(owner, { $inc: { balance: storeItem.cost } });
      // 50013: Missing Permissions
      if (error.code === 50013) {
        return interaction.reply(
          "I don't have permission to give you that role. Please contact a server administrator.",
        );
      }
      logger.error("buy-role: failed to add role:", error);
      return interaction.reply("An error occurred while giving you the role.");
    }

    return interaction.reply(
      `Congratulations! You have successfully purchased the ${role} role.`,
    );
  },
};
