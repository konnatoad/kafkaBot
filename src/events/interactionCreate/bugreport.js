const logger = require("../../extra/logger");
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
    const severity = interaction.fields
      .getTextInputValue("severity")
      .toLowerCase();

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
    // the GitHub issue can take longer than Discord's 3 seconds to answer in
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Create GitHub issue (public, so reporter and server details only go to the Discord embed)
    let issueUrl = null;
    let issueNumber = null;
    if (process.env.GITHUB_TOKEN) {
      const body = `## Bug Report\n\n### Description\n${description}\n\n### Steps to Reproduce\n${steps}\n\n### Expected vs Actual Behavior\n${expected}\n\n### Severity\n${severity}`;
      const githubOwner = process.env.GITHUB_OWNER;
      const githubRepo = process.env.GITHUB_REPO;
      const githubNamePattern = /^[A-Za-z0-9_.-]+$/;
      if (
        !githubOwner ||
        !githubRepo ||
        !githubNamePattern.test(githubOwner) ||
        !githubNamePattern.test(githubRepo)
      ) {
        logger.error("bugreport: invalid GitHub repository configuration.");
      } else {
        const githubIssueUrl = new URL(
          `/repos/${encodeURIComponent(githubOwner)}/${encodeURIComponent(githubRepo)}/issues`,
          "https://api.github.com",
        ).toString();

        await axios
          .post(
            githubIssueUrl,
            { title: `[Bug] ${feature}`, body, labels: ["bug"] },
            {
              headers: {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                Accept: "application/vnd.github+json",
              },
            },
          )
          .then((res) => {
            issueUrl = res.data.html_url;
            issueNumber = res.data.number;
          })
          .catch((err) => {
            logger.error(
              "bugreport: failed to create GitHub issue:",
              err.response?.data ?? err,
            );
          });
      }
    }

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle(`New bug report!${issueNumber ? ` (#${issueNumber})` : ""}`)
      .addFields({
        name: "Reporting member",
        value: `\`${member.user.username} (${id})\``,
      })
      .addFields({
        name: "Reporting guild",
        value: `\`${server.name} (${server.id})\``,
      })
      .addFields({ name: "Problematic feature", value: `> ${feature}` })
      .addFields({ name: "Description", value: `> ${description}` })
      .addFields({ name: "Steps to reproduce", value: `> ${steps}` })
      .addFields({ name: "Expected vs actual", value: `> ${expected}` })
      .addFields({ name: "Severity", value: `> ${severity}` })
      .setFooter({
        text: "Bug report system",
        iconURL: "https://vou.s-ul.eu/ts9RQjxl",
      })
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
          .setURL(issueUrl),
      );
    }

    const delivered = await channel
      .send({ embeds: [embed], components: [buttons] })
      .then(() => true)
      .catch((err) => {
        logger.error("bugreport: failed to send to bug channel:", err);
        return false;
      });

    await interaction.editReply(
      delivered || issueUrl
        ? "Your report has been recorded. My developer will look into this issue, and reach out with any further questions."
        : "Sorry, your report couldn't be delivered. Please try again in a bit.",
    );
  }
};
