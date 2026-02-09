const { EmbedBuilder, MessageFlags, InteractionType } = require("discord.js");
const ConfessionConfig = require("../../schemas/ConfessionConfig.js")

module.exports = async (a, b) => {
  let interaction = a;
  let client = b;

  const looksLikeInteraction = (x) =>
    x && typeof x === "object" && typeof x.reply === "function" && typeof x.type === "number";

  if (!looksLikeInteraction(interaction) && looksLikeInteraction(client)) {
    interaction = b;
    client = a;
  }

  if (!looksLikeInteraction(interaction)) return;

  if (interaction.type !== 5) return;
  if (interaction.customId !== "confession_modal_v1") return;
  if (!interaction.guildId) return;

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let text = interaction.fields?.getTextInputValue?.("confession_text") || "";
    text = text
      .trim();

    if (!text) {
      return interaction.editReply({
        content: "empty",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (text.length > 4000) {
      return interaction.editReply({
        content: "too long",
        flags: MessageFlags.Ephemeral,
      });
    }

    const cfg = await ConfessionConfig.findOne({ guildId: interaction.guildId });
    if (!cfg) {
      return interaction.editReply({
        content: "not set up"
      });
    }

    const channel = await client.channels.fetch(cfg.channelId).catch(() => null);
    if (!channel) {
      return interaction.editReply({
        content: "Confessions channel missing"
      });
    }

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle("Anonymous Confession")
      .setDescription(text)
      .setTimestamp();

    await channel.send({
      embeds: [embed],
    });

    return interaction.editReply({
      content: "sent"
    });
  } catch (err) {
    console.error("confession-modal error:", err)

    try {
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: "Something broke while sending"
        })
      }
      return interaction.reply({
        content: "Something broke while sending", flags: MessageFlags.Ephemeral,
      })
    } catch (_) { }
  }
}
