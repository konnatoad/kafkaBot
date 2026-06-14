const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const TriviaConfig = require("../../../../schemas/TriviaConfig");
const TriviaStats = require("../../../../schemas/TriviaStats");
const logger = require("../../../../extra/logger");

module.exports = {
  testOnly: true,
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("trivia-disable")
    .setDescription("Disable the daily trivia system for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Run this inside a server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const cfg = await TriviaConfig.findOne({ guildId: interaction.guildId });

      if (!cfg) {
        return interaction.reply({
          content: "Trivia has not been set up in this server.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!cfg.enabled) {
        return interaction.reply({
          content: "Trivia is already disabled.",
          flags: MessageFlags.Ephemeral,
        });
      }

      cfg.enabled = false;
      await cfg.save();
      await TriviaStats.deleteMany({ guildId: interaction.guildId });

      return interaction.reply({
        content: "✅ Daily trivia has been disabled and all answer history has been cleared. Run `/trivia-setup` to re-enable it.",
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      logger.error("trivia-disable error:", err);
      return interaction.reply({
        content: "Failed to disable trivia.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
