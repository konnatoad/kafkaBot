const logger = require("../../extra/logger");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const axios = require("axios");
const { hasOffensiveReportText } = require("../../utils/bugReportWords");

const PENDING_TITLE = "Bug report pending review";
const REPORT_FIELDS = [
  ["type", "Problematic feature"],
  ["description", "Description"],
  ["steps", "Steps to reproduce"],
  ["expected", "Expected vs actual"],
  ["severity", "Severity"],
];
const reviewing = new Set();

async function submit(interaction, client) {
  const fields = REPORT_FIELDS.map(([id, name]) => {
    const text = interaction.fields.getTextInputValue(id);
    return { name, value: id === "severity" ? text.toLowerCase() : text };
  });

  if (fields.some(({ value }) => hasOffensiveReportText(value))) {
    return interaction.reply({
      content: "please remove offensive language and submit the report again",
      flags: MessageFlags.Ephemeral,
    });
  }

  const channel = client.channels.cache.get(process.env.BUG);
  if (!channel) {
    return interaction.reply({
      content: "Bug report channel is not configured.",
      flags: MessageFlags.Ephemeral,
    });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { user, guild } = interaction;
  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle(PENDING_TITLE)
    .addFields(
      { name: "Reporting member", value: `\`${user.username} (${user.id})\`` },
      { name: "Reporting guild", value: `\`${guild.name} (${guild.id})\`` },
      ...fields.map(({ name, value }) => ({ name, value: `> ${value}` })),
    )
    .setFooter({
      text: "Bug report system",
      iconURL: "https://vou.s-ul.eu/ts9RQjxl",
    })
    .setTimestamp();

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bugApprove - ${user.id}`)
      .setStyle(ButtonStyle.Success)
      .setLabel("Approve"),
    new ButtonBuilder()
      .setCustomId(`bugDecline - ${user.id}`)
      .setStyle(ButtonStyle.Danger)
      .setLabel("Decline"),
  );

  const delivered = await channel
    .send({ embeds: [embed], components: [buttons] })
    .then(() => true)
    .catch((err) => {
      logger.error("bugreport: failed to send to bug channel:", err);
      return false;
    });

  await interaction.editReply(
    delivered
      ? "Your report was sent to the developer for review."
      : "Sorry, your report couldn't be delivered. Please try again in a bit.",
  );
}

function issuePayload(embed) {
  // Only these five fields go to GitHub. The reporter and server stay in Discord.
  const values = REPORT_FIELDS.map(([, name]) => {
    const field = embed.fields.find((field) => field.name === name);
    if (!field?.value.startsWith("> ")) throw new Error("Missing report field");
    return field.value.slice(2);
  });
  const [feature, description, steps, expected, severity] = values;
  return {
    title: `[Bug] ${feature}`,
    body: `## Bug Report\n\n### Description\n${description}\n\n### Steps to Reproduce\n${steps}\n\n### Expected vs Actual Behavior\n${expected}\n\n### Severity\n${severity}`,
    labels: ["bug"],
  };
}

function resolveButton(userId) {
  return new ButtonBuilder()
    .setCustomId(`bugSolved - ${userId}`)
    .setStyle(ButtonStyle.Danger)
    .setLabel("Mark as solved");
}

async function approve(interaction, message, embed, userId) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  const githubName = /^[A-Za-z0-9_.-]+$/;
  if (
    !GITHUB_TOKEN ||
    !githubName.test(GITHUB_OWNER ?? "") ||
    !githubName.test(GITHUB_REPO ?? "")
  ) {
    return interaction.editReply(
      "GitHub is not configured. The report is still pending.",
    );
  }

  const payload = issuePayload(embed);
  const pendingButtons = message.components;
  const endpoint = new URL(
    `/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/issues`,
    "https://api.github.com",
  );
  // Persist the claim before publishing, so an interrupted approval can't be
  // retried blindly after a restart.
  await message.edit({
    embeds: [EmbedBuilder.from(embed).setTitle("Publishing bug report")],
    components: [],
  });

  let issue;
  try {
    const { data } = await axios.post(endpoint.toString(), payload, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!Number.isInteger(data?.number) || !data.html_url) {
      throw new Error("GitHub returned an incomplete issue");
    }
    issue = data;
  } catch (err) {
    const status = err.response?.status;
    logger.error(
      `bugreport: GitHub issue creation failed (${status ?? err.code ?? "unknown"})`,
    );
    if ([400, 401, 403, 404, 410, 422, 429].includes(status)) {
      await message.edit({ embeds: [embed], components: pendingButtons });
      return interaction.editReply(
        "GitHub rejected the issue. The report is still pending and you can retry.",
      );
    }
    await message
      .edit({
        embeds: [
          EmbedBuilder.from(embed)
            .setColor("Yellow")
            .setTitle("GitHub outcome needs checking"),
        ],
      })
      .catch((error) =>
        logger.error(
          `bugreport: couldn't mark uncertain outcome (${error.code ?? "unknown"})`,
        ),
      );
    return interaction.editReply(
      "Couldn't confirm whether GitHub created the issue. Check GitHub before creating an issue manually.",
    );
  }

  const buttons = new ActionRowBuilder().addComponents(
    resolveButton(userId),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("View on GitHub")
      .setURL(issue.html_url),
  );
  try {
    await message.edit({
      embeds: [
        EmbedBuilder.from(embed)
          .setColor("Green")
          .setTitle(`Bug report approved (#${issue.number})`),
      ],
      components: [buttons],
    });
  } catch (err) {
    logger.error(
      `bugreport: couldn't update Discord report after publishing issue #${issue.number} (${err.code ?? "unknown"})`,
    );
    return interaction.editReply(
      `GitHub issue created, but the Discord report couldn't be updated: <${issue.html_url}>`,
    );
  }
  return interaction.editReply(`GitHub issue created: <${issue.html_url}>`);
}

async function review(interaction, client, decision, userId) {
  if (interaction.user.id !== process.env.DEV_ID) {
    return interaction.reply({
      content: "Only the bot developer can review bug reports.",
      flags: MessageFlags.Ephemeral,
    });
  }
  if (
    interaction.channelId !== process.env.BUG ||
    interaction.message.author.id !== client.user.id
  )
    return;

  const { id } = interaction.message;
  if (reviewing.has(id)) {
    return interaction.reply({
      content: "This report is already being reviewed.",
      flags: MessageFlags.Ephemeral,
    });
  }

  reviewing.add(id);
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const message = await interaction.message.fetch(true);
    const [embed] = message.embeds;
    if (embed?.title !== PENDING_TITLE) {
      return await interaction.editReply("This report is no longer pending.");
    }
    if (decision === "Approve") {
      await approve(interaction, message, embed, userId);
    } else {
      await message.edit({
        embeds: [
          EmbedBuilder.from(embed)
            .setColor("Red")
            .setTitle("Bug report declined"),
        ],
        components: [
          new ActionRowBuilder().addComponents(resolveButton(userId)),
        ],
      });
      await interaction.editReply("Report declined.");
    }
  } catch (err) {
    logger.error(`bugreport: review failed (${err.code ?? "unknown"})`);
    if (interaction.deferred) {
      await interaction
        .editReply(
          "Couldn't finish reviewing this report. Check the report's current status.",
        )
        .catch(() => {});
    }
  } finally {
    reviewing.delete(id);
  }
}

module.exports = async (interaction, client) => {
  if (interaction.customId === "bugreport") {
    if (interaction.guild && interaction.isModalSubmit()) {
      return submit(interaction, client);
    }
    return;
  }

  const decision = interaction.customId?.match(
    /^bug(Approve|Decline) - (\d+)$/,
  );
  if (decision && interaction.isButton()) {
    return review(interaction, client, decision[1], decision[2]);
  }
};
