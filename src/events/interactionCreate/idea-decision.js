const logger = require("../../extra/logger");
const {
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const { devs } = require("../../../config.json");
const { quote, unquote } = require("../../utils/ideas");

const DECISIONS = {
  approve: { done: "approved", by: "Approved", end: "!", color: "Green" },
  decline: { done: "declined", by: "Declined", end: ".", color: "Red" },
};

const notDev = (interaction) =>
  interaction.reply({
    content: "Only the bot developer can do that.",
    flags: MessageFlags.Ephemeral,
  });

// Approve / Decline on an idea post: ask for an optional message to the sender
async function askForNote(interaction, decision, userId) {
  const note = new TextInputBuilder()
    .setCustomId("ideaNote")
    .setLabel("Message to the sender")
    .setPlaceholder("optional, sent with the answer")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000);

  const modal = new ModalBuilder()
    .setCustomId(`ideaDecision - ${decision} - ${userId}`)
    .setTitle(decision === "approve" ? "Approve idea" : "Decline idea")
    .addComponents(new ActionRowBuilder().addComponents(note));

  await interaction.showModal(modal);
}

// the form sent: tell the sender, then mark the post and drop its buttons
async function decide(interaction, client, decision, userId) {
  const d = DECISIONS[decision];
  const note = interaction.fields.getTextInputValue("ideaNote").trim();
  const post = interaction.message?.embeds[0];
  const ideaField = post?.fields.find((f) => f.name === "Idea");
  const idea = ideaField ? unquote(ideaField.value) : "your idea";

  const dm =
    `Your idea "${idea}" was ${d.done}${d.end}` +
    (note ? `\n\n**Developer's note:**\n${quote(note)}` : "");
  const sender = await client.users.fetch(userId).catch(() => null);
  const delivered = sender
    ? await sender
        .send(dm)
        .then(() => true)
        .catch((err) => {
          // 50007: their DMs are closed
          if (err.code !== 50007)
            logger.error("idea-decision: failed to DM the sender:", err);
          return false;
        })
    : false;

  if (post && interaction.isFromMessage()) {
    const marked = EmbedBuilder.from(post)
      .setColor(d.color)
      .setTitle(`💡 Idea ${d.done}`)
      .addFields({
        name: `${d.by} by ${interaction.user.username}`,
        value: note ? quote(note) : "no message",
      });
    await interaction.update({ embeds: [marked], components: [] });
  } else {
    await interaction.deferUpdate();
  }

  await interaction.followUp({
    content: delivered
      ? "Sent to them."
      : "Couldn't DM them, the post is marked anyway.",
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = async (interaction, client) => {
  try {
    if (interaction.isButton()) {
      const match = interaction.customId.match(
        /^idea(Approve|Decline) - (\d+)$/,
      );
      if (!match) return;
      if (!devs.includes(interaction.user.id)) return notDev(interaction);
      return askForNote(interaction, match[1].toLowerCase(), match[2]);
    }

    if (interaction.isModalSubmit()) {
      const match = interaction.customId.match(
        /^ideaDecision - (approve|decline) - (\d+)$/,
      );
      if (!match) return;
      if (!devs.includes(interaction.user.id)) return notDev(interaction);
      return decide(interaction, client, match[1], match[2]);
    }
  } catch (err) {
    logger.error("idea-decision error:", err);
  }
};
