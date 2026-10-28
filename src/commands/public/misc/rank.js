const path = require("path");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const { RankCardBuilder, Font } = require("canvacord");
const levelSchema = require("../../../schemas/level");
const { xpForNextLevel } = require("../../../utils/levels");

const FONT_FILE = path.join(__dirname, "../../../static/Roboto-BoldItalic.ttf");
let font;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Gets a members rank in the server")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member you want to check the rank of")
        .setRequired(false),
    ),

  run: async ({ interaction }) => {
    // the resolved member comes with the interaction, cached or not
    const member = interaction.options.getMember("user") ?? interaction.member;
    if (
      interaction.options.getUser("user") &&
      !interaction.options.getMember("user")
    ) {
      return interaction.reply("That user isn't in this server.");
    }

    const level = await levelSchema.findOne({
      Guild: interaction.guildId,
      User: member.id,
    });
    if (!level) {
      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setDescription(`${member} has not gained any xp yet.`);
      return interaction.reply({ embeds: [embed] });
    }

    await interaction.deferReply();
    font ??= await Font.fromFile(FONT_FILE);

    const card = await new RankCardBuilder()
      .setFonts(font)
      .setAvatar(member.displayAvatarURL({ forceStatic: true }))
      .setOverlay(true)
      .setBackground(`https://vou.s-ul.eu/UlU1YgmA`)
      .setCurrentXP(level.XP)
      .setRequiredXP(xpForNextLevel(level.Level))
      .setLevel(level.Level, "Level")
      .setUsername(member.user.username)
      .build({ format: "png" });

    const embed = new EmbedBuilder()
      .setColor("DarkPurple")
      .setTitle(`**${member.user.username}'s Level / XP**`)
      .setImage("attachment://rank.png")
      .setTimestamp()
      .setFooter({ text: "Level/XP", iconURL: "https://vou.s-ul.eu/ts9RQjxl" });
    await interaction.editReply({
      embeds: [embed],
      files: [new AttachmentBuilder(card, { name: "rank.png" })],
    });
  },
};
