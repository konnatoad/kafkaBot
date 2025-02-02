const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const StoreItem = require("../../../../schemas/Store");

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("store-setup")
    .setDescription("Configure the store system for rice grains")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a role to the rice store")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("The role to add to the rice store")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("cost")
            .setDescription("The cost of the role in rice grains")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a role from the rice store")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("The role to remove from the rice store")
            .setRequired(true)
        )
    ),
  run: async ({ interaction }) => {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id; // Get the guild ID

    if (subcommand === "add") {
      const roleToAdd = interaction.options.getRole("role");
      const cost = interaction.options.getInteger("cost");

      // Check if role is already in the store
      const existingItem = await StoreItem.findOne({
        guildId,
        roleId: roleToAdd.id,
      });
      if (existingItem) {
        return interaction.reply({
          content:
            "This role is already in the rice grains store. You can use `/store-setup remove` to remove it.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Create new store item
      const newItem = new StoreItem({
        guildId: guildId,
        roleId: roleToAdd.id,
        cost: cost,
      });
      await newItem.save();

      return interaction.reply({
        content: `The role ${roleToAdd.name} has been added to the rice grains store with a cost of ${cost} rice grains.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === "remove") {
      const roleToRemove = interaction.options.getRole("role");

      // Check if role is in the store
      const existingItem = await StoreItem.findOne({
        guildId,
        roleId: roleToRemove.id,
      });
      if (!existingItem) {
        return interaction.reply({
          content: "This role is not in the rice grains store.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Remove store item
      await StoreItem.findOneAndDelete({ guildId, roleId: roleToRemove.id });

      return interaction.reply({
        content: `The role ${roleToRemove.name} has been removed from the rice grains store.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
