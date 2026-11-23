const { SlashCommandBuilder } = require("discord.js");
const StoreItem = require("../../../schemas/Store");
const UserProfile = require("../../../schemas/UserProfile");
const logger = require("../../../extra/logger");

// shortcut: in-memory, one process per guild, shared workers need a db lock
const buying = new Set();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buy-role")
    .setDescription("buy a role from the rice grain store")
    .addRoleOption((option) =>
      option.setName("role").setDescription("The role you want to buy").setRequired(true),
    ),
  run: async ({ interaction }) => {
    const role = interaction.options.getRole("role");
    const owner = { userId: interaction.user.id, Guild: interaction.guild.id };

    // taken before any await, so a second submit can't slip past the checks below
    const key = `${owner.Guild}:${owner.userId}:${role.id}`;
    if (buying.has(key)) {
      return interaction.reply("Your purchase of this role is already being processed.");
    }
    buying.add(key);
    try {
      const storeItem = await StoreItem.findOne({
        guildId: interaction.guild.id,
        roleId: role.id,
      });
      if (!storeItem) {
        return interaction.reply("This role is not available for purchase.");
      }
      // forced fetch: the cached member stays stale after roles.add
      const member = await interaction.member.fetch(true);
      if (member.roles.cache.has(role.id)) {
        return interaction.reply({
          content: `You already have the ${role} role.`,
          allowedMentions: { parse: [] },
        });
      }

      // takes the cost only if they have it at the moment it's taken
      const paid = await UserProfile.findOneAndUpdate(
        { ...owner, balance: { $gte: storeItem.cost } },
        { $inc: { balance: -storeItem.cost } },
      );
      if (!paid) {
        return interaction.reply("You do not have enough rice grains to buy this role.");
      }

      try {
        await member.roles.add(role.id);
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
    } finally {
      buying.delete(key);
    }

    return interaction.reply({
      content: `Congratulations! You have successfully purchased the ${role} role.`,
      allowedMentions: { parse: [] },
    });
  },
};
