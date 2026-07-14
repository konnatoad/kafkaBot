const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");

const AutoModConfig = require("../../../../schemas/AutoModConfig");
const logger = require("../../../../extra/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod-disable")
    .setDescription("turn automod off for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "run this inside a server",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const cfg = await AutoModConfig.findOne({ guildId: interaction.guild.id });
      if (!cfg) {
        return interaction.editReply("automod isn't set up here, nothing to disable");
      }

      let failedDeletes = 0;
      for (const ruleId of Object.values(cfg.ruleIds ?? {})) {
        if (!ruleId) continue;
        await interaction.guild.autoModerationRules.delete(ruleId).catch((err) => {
          if (err.status !== 404) {
            failedDeletes++;
            logger.error(`automod-disable: failed to delete rule ${ruleId}: ${err}`);
          }
        });
      }

      await AutoModConfig.deleteOne({ guildId: interaction.guild.id });

      return interaction.editReply(
        failedDeletes > 0
          ? `automod config removed, but ${failedDeletes} rule(s) couldn't be deleted on discord (check my permissions) — you may need to remove them manually in server settings.`
          : "automod is off. run `/automod-setup` to turn it back on."
      );
    } catch (error) {
      logger.error(`automod-disable error: ${error}`);
      return interaction.editReply("something broke disabling automod");
    }
  },
};
