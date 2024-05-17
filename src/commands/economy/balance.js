const { SlashCommandBuilder } = require("discord.js");
const UserProfile = require("../../schemas/UserProfile");

module.exports = {
  deleted: false,
  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "This command can only be executed inside a server.",
        ephemeral: true,
      });
      return;
    }

    const targetUserId =
      interaction.options.getUser("target-user")?.id || interaction.user.id;

    await interaction.deferReply();

    try {
      let userProfile = await UserProfile.findOne({
        userId: targetUserId,
        Guild: interaction.guild.id
      });

      if (!userProfile) {
        interaction.editReply({
          content: `This user doesn't have a record in my database.`,
        });
        return;
      }

      interaction.editReply(
        targetUserId === interaction.user.id
          ? {
              content: `You have ${userProfile.balance} rice grains.`,
            }
          : {
              content: `<@${targetUserId}> has ${userProfile.balance} rice grains.`,
            }
      );
    } catch (error) {
      console.log(`Error handling /balance ${error}`);
    }
  },

  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your balance")
    .addMentionableOption((option) =>
      option
        .setName("target-user")
        .setDescription("The user whose balance you want to see.")
    ),
};
