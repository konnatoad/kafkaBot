const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const StoreItem = require("../../../schemas/Store");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("store")
    .setDescription("View the roles available for purchase in the store"),
  run: async ({ interaction }) => {
    try {
      const guildName = interaction.guild.name;
      const guildId = interaction.guild.id;

      // Fetch all roles available in the store for the current guild
      const storeItems = await StoreItem.find({ guildId });

      if (!storeItems || storeItems.length === 0) {
        return interaction.reply({
          content: "There are no roles available for purchase in the store.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`**${guildName}'s Store**`)
        .setDescription("**Here are the roles available for purchase:**")
        .setColor("#FF0000")
        .setTimestamp()
        .setFooter({ text: "Store", iconURL: "https://vou.s-ul.eu/ts9RQjxl" });

      // Add each role with its price and ID as a field in the embed
      for (const item of storeItems) {
        const role = interaction.guild.roles.cache.get(item.roleId);
        if (role) {
          const roleName = role.name;
          const cost = item.cost;
          embed.addFields({
            name: `• **${roleName}**`,
            value: `Cost: **${cost}** rice grains\nRole ID: **${item.roleId}**`,
            inline: false,
          });
        } else {
          console.error(`Role with ID ${item.roleId} not found in guild.`);
        }
      }

      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error fetching store items:", error);
      return interaction.reply({
        content: "An error occurred while fetching store items.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
