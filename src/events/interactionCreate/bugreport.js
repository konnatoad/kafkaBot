require("dotenv").config();
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

module.exports = async (interaction, client) => {
  if (!interaction.guild || !interaction.isModalSubmit()) return;

  if (interaction.customId === "bugreport") {
    const command = interaction.fields.getTextInputValue("type");
    const description = interaction.fields.getTextInputValue("description");

    const id = interaction.user.id;
    const member = interaction.member;
    const server = interaction.guild;

    const channel = await client.channels.cache.get(process.env.BUG);

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle("New bug report!")
      .addFields({
        name: "Reporting member",
        value: `\`${member.user.username} (${id})\``,
      })
      .addFields({
        name: "Reporting guild",
        value: `\`${server.name} (${server.id})\``,
      })
      .addFields({ name: "Problematic feature", value: `> ${command}` })
      .addFields({ name: "Report description", value: `> ${description}` })
      .setFooter({
        text: "Bug report system",
        iconURL: "https://vou.s-ul.eu/ts9RQjxl",
      })
      .setTimestamp();

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bugSolved - ${id}`)
        .setStyle(ButtonStyle.Danger)
        .setLabel(`Mark as solved`)
    );

    await channel
      .send({ embeds: [embed], components: [button] })
      .catch((err) => {});
    await interaction.reply({
      content:
        "Your report has been recorded. My developer will look into this issue, and reach out with any further questions.",
      flags: MessageFlags.Ephemeral,
    });
  }
};
