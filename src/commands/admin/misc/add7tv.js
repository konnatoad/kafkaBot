const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const sharp = require("sharp");
const logger = require("../../../extra/logger");

const MAX_EMOJI_BYTES = 256_000;
// Discord's answers that are the server's to fix, not a bug
const EMOJI_ERRORS = {
  30008: "This server has no emoji slots left.",
  50013: "I need the **Manage Expressions** permission to add emojis.",
};

module.exports = {
  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      return interaction.reply("Run this inside a server.");
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const match = interaction.options
      .getString("link", true)
      .trim()
      .match(/\/emotes\/([a-zA-Z0-9]{24,})/);
    if (!match) {
      return interaction.editReply(
        "That doesn’t look like a valid 7TV emote link.",
      );
    }

    try {
      const res = await fetch(`https://7tv.io/v3/emotes/${match[1]}`);
      if (!res.ok) return interaction.editReply("Couldn’t reach the 7TV API");
      const emote = await res.json();

      // Discord emoji names are 2-32 letters, digits or underscores
      const name = (interaction.options.getString("name") || emote.name)
        .replace(/[^a-z0-9_]/gi, "_")
        .slice(0, 32);
      if (name.length < 2) {
        return interaction.editReply(
          "Give the emoji a name of at least 2 characters.",
        );
      }

      const file =
        emote.host.files
          .filter((f) => f.format === "WEBP")
          .sort((a, b) => b.width - a.width)[0] ?? emote.host.files[0];
      const download = await fetch(`https:${emote.host.url}/${file.name}`);
      if (!download.ok)
        return interaction.editReply("Couldn’t download that emote from 7TV.");
      let image = Buffer.from(await download.arrayBuffer());

      // Discord's emoji limit; a smaller file is used as it is
      if (image.length > MAX_EMOJI_BYTES) {
        image = await sharp(image)
          .resize(256, 256, { fit: "inside" })
          .png()
          .toBuffer();
        if (image.length > MAX_EMOJI_BYTES) {
          return interaction.editReply(
            "Still too chunky after resizing (>256 kB).",
          );
        }
      }

      const emoji = await interaction.guild.emojis.create({
        attachment: image,
        name,
      });
      return interaction.editReply(`Added ${emoji}  \`:${emoji.name}:\``);
    } catch (err) {
      if (EMOJI_ERRORS[err.code])
        return interaction.editReply(EMOJI_ERRORS[err.code]);
      logger.error("Error adding 7TV emote:", err);
      return interaction.editReply(
        "Something went wrong trying to add that emote.",
      );
    }
  },

  data: new SlashCommandBuilder()
    .setName("add7tv")
    .setDescription("Add a 7TV emote to this server")
    .addStringOption((option) =>
      option
        .setName("link")
        .setDescription("Full 7TV emote URL")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("name").setDescription("Custom emoji name (optional)"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
};
