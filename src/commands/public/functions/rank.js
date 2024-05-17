const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const levelSchema = require("../../../schemas/level");
const Canvacord = require("canvacord");
const { RankCardBuilder, Font } = require("canvacord");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Gets a members rank in the server")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member you want to check the rank of")
        .setRequired(false)
    ),

  run: async ({ interaction }) => {
    const { options, user, guild } = interaction;

    const Member = options.getMember("user") || user;

    const member = guild.members.cache.get(Member.id);

    const Data = await levelSchema.findOne({
      Guild: guild.id,
      User: member.id,
    });

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setDescription(`${member} has not gained any xp yet.`);

    if (!Data) return await interaction.reply({ embeds: [embed] });

    await interaction.deferReply();

    const Required = Data.Level * Data.Level * 20 + 20;

    const font = await Font.fromFile("src/static/Roboto-BoldItalic.ttf");
    //const font = Font.loadDefault();

    const rank = new RankCardBuilder()
      .setFonts(font)
      .setAvatar(member.displayAvatarURL({ forseStatic: true }))
      .setOverlay(true)
      .setBackground(`https://vou.s-ul.eu/UlU1YgmA`)
      .setCurrentXP(Data.XP)
      .setRequiredXP(Required)
      //.setRank(counter, "Rank", false)
      .setLevel(Data.Level, "Level")
      .setUsername(member.user.username);

    const Card = await rank.build({
      format: "png",
    });

    const attachment = new AttachmentBuilder(Card, { name: "rank.png" });

    const embed2 = new EmbedBuilder()
      .setColor("DarkPurple")
      .setTitle(`**${member.user.username}'s Level / XP**`)
      .setImage("attachment://rank.png")
      .setTimestamp()
      .setFooter({
        text: "Level/XP",
        iconURL: "https://vou.s-ul.eu/ts9RQjxl",
      });

    await interaction.editReply({ embeds: [embed2], files: [attachment] });
  },
};
