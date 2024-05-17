module.exports = async (interaction) => {
  if (interaction.isButton()) {
    try {
      await interaction.deferReply({ ephemeral: true });

      // if there isn't role that is specified with id
      const role = interaction.guild.roles.cache.get(interaction.customId);
      if (!role) {
        interaction.reply({
          content: "i couldn't find that role",
        });
        return;
      }

      // if person pressing the role has a specified role already

      const hasRole = interaction.member.roles.cache.has(role.id);

      if (hasRole) {
        await interaction.member.roles.remove(role);
        await interaction.editReply(`the role ${role} has been removed!`);
        return;
      }
      // if person pressing the role does not have specified role already
      await interaction.member.roles.add(role);
      await interaction.editReply(`the role ${role} has been added!`);
      return;
    } catch (error) {
      console.log(error);
    }
  }
};
