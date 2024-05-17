const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
    PermissionFlagsBits,
  } = require("discord.js");
  const levelSchema = require("../../schemas/level");
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName("xp-reset")
      .setDescription("Resets ALL of the servers XP levels.")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
    run: async ({ interaction }) => {
      const { guildId } = interaction;
  
  
      const data = await levelSchema.deleteMany(
        { Guild: guildId },
      );


      const embed = new EmbedBuilder()
            .setColor("DarkPurple")
            .setDescription(`The xp system in your server has been reset!`);
  
          await interaction.reply({ embeds: [embed] });
    },
  };
  