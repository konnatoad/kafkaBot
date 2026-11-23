const { EmbedBuilder, MessageFlags } = require("discord.js");
const ConfessionConfig = require("../../schemas/ConfessionConfig.js");
const logger = require("../../extra/logger");
const {
  blockedWordsFor,
  findBlockedWord,
} = require("../../utils/blockedWords");

// the mod copy, with who sent it; the confession is already out, so a failure here is only logged
async function logConfession(client, cfg, interaction, posted) {
  try {
    const logChannel = await client.channels.fetch(cfg.logChannelId);
    const embed = new EmbedBuilder()
      .setColor("Grey")
      .setTitle("Confession log")
      .setDescription(posted.embeds[0]?.description ?? "")
      .addFields(
        {
          name: "Sent by",
          value: `${interaction.user} (${interaction.user.id})`,
        },
        { name: "Posted", value: posted.url },
      )
      .setTimestamp();
    await logChannel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  } catch (err) {
    logger.warn(
      `confession-modal: couldn't post to the log channel of guild ${cfg.guildId}: ${err}`,
    );
  }
}

module.exports = async (interaction, client) => {
  if (!interaction.isModalSubmit()) return;
  if (!interaction.customId.startsWith("confession_modal_v1")) return;
  const shownLogged = interaction.customId === "confession_modal_v1:logged";
  if (!interaction.guildId) return;

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const text = (
      interaction.fields.getTextInputValue("confession_text") || ""
    ).trim();

    if (!text) {
      return interaction.editReply({
        content: "empty",
      });
    }
    if (text.length > 4000) {
      return interaction.editReply({
        content: "too long",
      });
    }
    const blocked = findBlockedWord(
      text,
      await blockedWordsFor(interaction.guildId),
    );
    if (blocked) {
      // Only log the server, without the matched text or sender.
      logger.info(
        `confession rejected in guild "${interaction.guild?.name}" ${interaction.guildId}`,
      );
      return interaction.editReply({
        content: "that can't be posted",
      });
    }

    const cfg = await ConfessionConfig.findOne({
      guildId: interaction.guildId,
    });
    if (!cfg) {
      return interaction.editReply({
        content: "not set up",
      });
    }

    const channel = await client.channels
      .fetch(cfg.channelId)
      .catch(() => null);
    if (!channel) {
      return interaction.editReply({
        content: "Confessions channel missing",
      });
    }

    // logging was switched on after this form was opened, so the warning was never shown
    if (cfg.logChannelId && !shownLogged) {
      return interaction.editReply({
        content:
          "logging was turned on after you opened this form. reopen /confess to see the warning first.",
      });
    }

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle("Anonymous Confession")
      .setDescription(text)
      .setTimestamp();

    const posted = await channel.send({
      embeds: [embed],
    });

    if (cfg.logChannelId) await logConfession(client, cfg, interaction, posted);

    return interaction.editReply({
      content: "sent",
    });
  } catch (err) {
    logger.error("confession-modal error:", err);

    try {
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: "Something broke while sending",
        });
      }
      return interaction.reply({
        content: "Something broke while sending",
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyErr) {
      logger.error("confession-modal: failed to send error reply:", replyErr);
    }
  }
};
