const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const userProfile = require("../../../schemas/UserProfile");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ricetop")
    .setDescription("This gets a servers rice grain leaderboard."),

  run: async ({ interaction }) => {
    const { guild, client } = interaction;

    let text = "";

    const embed1 = new EmbedBuilder()
      .setColor("Blurple")
      .setDescription("No one is on the leaderboard yet...");

    const Duata = await userProfile.findOne({
      Guild: guild.id,
    });

    const Data = await userProfile
      .find({ Guild: guild.id })
      .sort({
        balance: -1,
      })
      .limit(10);

    if (!Duata) return await interaction.reply({ embeds: [embed1] });

    await interaction.deferReply();

    for (let counter = 0; counter < Data.length; ++counter) {
      let { userId, balance } = Data[counter];

      const value = (await client.users.fetch(userId)) || "Unknown Member";

      const member = value.tag;

      text += `${counter + 1}. ${member} | rice grains: ${balance}  \n`;

      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setTitle(`${interaction.guild.name}'s wealth leaderboard:`)
        .setDescription(`\`\`\`${text}\`\`\``)
        .setTimestamp()
        .setFooter({
          text: "Wealth Leaderboard",
          iconURL: "https://vou.s-ul.eu/ts9RQjxl",
        });

      interaction.editReply({ embeds: [embed] });
    }
  },
};
