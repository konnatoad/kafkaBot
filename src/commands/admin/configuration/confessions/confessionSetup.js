const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags
} = require("discord.js");

const ConfessionConfig = require("../../../../schemas/ConfessionConfig");

module.exports = {
  testOnly: false,
  data: new SlashCommandBuilder()
    .setName("confession-setup") // matches your screenshot
    .setDescription("Set the channel where anonymous confessions are posted.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel to publish confessions to")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    ),

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
      if (existing) {
        const current = await interaction.guild.channels
          .fetch(existing.channelId)
          .catch(() => null);

        return interaction.reply({
          content:
            `Confessions are already set up${current ? ` in ${current}` : ""
            }.\n` +
            "Use `/confession-disable` first if you want to change the channel.",
          flags: MessageFlags.Ephemeral
        });
      }

      const channel = interaction.options.getChannel("channel", true);

      await ConfessionConfig.create({
        guildId: interaction.guildId,
        channelId: channel.id
      });

      return interaction.reply({
        content: `Confessions will be posted in ${channel}.`,
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      if (err?.code === 11000) {
        return interaction.reply({
          content:
            "Confessions were just set up by someone else. Use `/confession-disable` if you need to change it.",
          flags: MessageFlags.Ephemeral
        });
      }

      console.log("confession-setup error:", err);
      return interaction.reply({
        content: "Failed to save the confessions channel.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
