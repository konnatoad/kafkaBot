const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const ConfessionConfig = require("../../../../schemas/ConfessionConfig");

module.exports = {
  testOnly: false,
  data: new SlashCommandBuilder()
    .setName("confessions-disable")
    .setDescription("Disable anonymous confessions in this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  run: async ({ interaction }) => {
    try {
      if (!interaction.inGuild()) {
        return interaction.reply({
          content: "Run this inside a server.",
          flags: MessageFlags.Ephemeral
        });
      }

      const existing = await ConfessionConfig.findOne({
        guildId: interaction.guildId
      });

      if (!existing) {
        return interaction.reply({
          content: "Confessions are not enabled in this server.",
          flags: MessageFlags.Ephemeral
        });
      }

      await ConfessionConfig.deleteOne({ guildId: interaction.guildId });

      return interaction.reply({
        content: "Anonymous confessions have been disabled.",
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      console.log("confessionsdisable error:", err);
      return interaction.reply({
        content: "Failed to disable confessions.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
