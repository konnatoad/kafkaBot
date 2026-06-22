const logger = require("../../extra/logger");
require("dotenv").config();
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const axios = require("axios");

module.exports = async (interaction, client) => {
  if (!interaction.guild || !interaction.isModalSubmit()) return;

  if (interaction.customId === "bugreport") {
    const feature = interaction.fields.getTextInputValue("type");
    const description = interaction.fields.getTextInputValue("description");
    const steps = interaction.fields.getTextInputValue("steps");
    const expected = interaction.fields.getTextInputValue("expected");
    const severity = interaction.fields.getTextInputValue("severity").toLowerCase();

    const id = interaction.user.id;
    const member = interaction.member;
    const server = interaction.guild;

    const channel = client.channels.cache.get(process.env.BUG);
    if (!channel) {
      return interaction.reply({
        content: "Bug report channel is not configured.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Create GitHub issue
    let issueUrl = null;
    let issueNumber = null;
    if (process.env.GITHUB_TOKEN) {
      const body = `## Bug Report\n**Reported by:** ${member.user.username} (\`${id}\`) in **${server.name}** (\`${server.id}\`)\n\n### Description\n${description}\n\n### Steps to Reproduce\n${steps}\n\n### Expected vs Actual Behavior\n${expected}\n\n### Severity\n${severity}`;
      await axios
        .post(
          `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/issues`,
          { title: `[Bug] ${feature}`, body, labels: ["bug"] },
          {
            headers: {
              Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
              Accept: "application/vnd.github+json",
            },
          }
        )
        .then((res) => {
          issueUrl = res.data.html_url;
          issueNumber = res.data.number;
        })
        .catch((err) => {
          logger.error("bugreport: failed to create GitHub issue:", err.response?.data ?? err);
        });
    }

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle(`New bug report!${issueNumber ? ` (#${issueNumber})` : ""}`)
      .addFields({ name: "Reporting member", value: `\`${member.user.username} (${id})\`` })
      .addFields({ name: "Reporting guild", value: `\`${server.name} (${server.id})\`` })
      .addFields({ name: "Problematic feature", value: `> ${feature}` })
      .addFields({ name: "Description", value: `> ${description}` })
      .addFields({ name: "Steps to reproduce", value: `> ${steps}` })
      .addFields({ name: "Expected vs actual", value: `> ${expected}` })
      .addFields({ name: "Severity", value: `> ${severity}` })
      .setFooter({ text: "Bug report system", iconURL: "https://vou.s-ul.eu/ts9RQjxl" })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bugSolved - ${id}`)
        .setStyle(ButtonStyle.Danger)
        .setLabel("Mark as solved"),
    );

    if (issueUrl) {
      buttons.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("View on GitHub")
          .setURL(issueUrl)
      );
    }

    await channel.send({ embeds: [embed], components: [buttons] }).catch((err) => {
      logger.error("bugreport: failed to send to bug channel:", err);
    });

    await interaction.reply({
      content: "Your report has been recorded. My developer will look into this issue, and reach out with any further questions.",
      flags: MessageFlags.Ephemeral,
    });
  }
};
