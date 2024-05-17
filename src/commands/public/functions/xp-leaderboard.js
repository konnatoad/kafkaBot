const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const levelSchema = require("../../../schemas/level");
const level = require("../../../schemas/level");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("xp-leaderboard")
    .setDescription("This gets a servers xp leaderboard."),

  run: async ({ interaction }) => {
    const { guild, client } = interaction;

    let text = "";

    const embed1 = new EmbedBuilder()
      .setColor("Blurple")
      .setDescription("No one is on the leaderboard yet...");

    const Duata = await levelSchema.findOne({
      Guild: guild.id,
    });

    const Data = await levelSchema
      .find({ Guild: guild.id })
      .sort({
        XP: -1,
        level: -1,
      })
      .limit(10);

    if (!Duata) return await interaction.reply({ embeds: [embed1] });

    await interaction.deferReply();

    for (let counter = 0; counter < Data.length; ++counter) {
      let { User, XP, Level } = Data[counter];

      const value = (await client.users.fetch(User)) || "Unknown Member";

      const member = value.tag;

      text += `${counter + 1}. ${member} | XP: ${XP} | Level: ${Level} \n`;

      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setTitle(`${interaction.guild.name}'s XP Leaderboard:`)
        .setDescription(`\`\`\`${text}\`\`\``)
        .setTimestamp()
        .setFooter({
          text: "XP Leaderboard",
          iconURL: "https://vou.s-ul.eu/ts9RQjxl",
        });

      interaction.editReply({ embeds: [embed] });
    }
  },
};
