const {
  Client,
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const sharp = require("sharp");

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  run: async ({ client, interaction }) => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (!interaction.guild) return;

      const url = interaction.options.getString("link", true).trim();
      const match = url.match(/\/emotes\/([a-zA-Z0-9]{24,})/);

      if (!match) {
        return interaction.editReply(
          "That doesn’t look like a valid 7TV emote link."
        );
      }

      const emoteId = match[1];
      const res = await fetch(`https://7tv.io/v3/emotes/${emoteId}`);

      if (!res.ok) {
        return interaction.editReply("Couldn’t reach the 7TV API 😢");
      }

      const emote = await res.json();
      const file =
        [...emote.host.files]
          .filter((f) => f.format === "WEBP")
          .sort((a, b) => b.width - a.width)[0] || emote.host.files[0];

      const fileUrl = `https:${emote.host.url}/${file.name}`;

      const imgBuf = Buffer.from(await (await fetch(fileUrl)).arrayBuffer());

      let finalBuf = imgBuf;

      // If the file is already < 256 KB, don't touch it
      if (imgBuf.length > 256_000) {
        finalBuf = await sharp(imgBuf)
          .resize(256, 256, { fit: "inside" })
          .png()
          .toBuffer();

        if (finalBuf.length > 256_000) {
          return interaction.editReply(
            "Still too chunky after resizing (>256 kB)."
          );
        }
      }

      if (finalBuf.length > 256_000) {
        return interaction.editReply(
          "Still too chunky after resizing (>256 kB)."
        );
      }

      const name = (
        interaction.options.getString("name") || emote.name
      ).replace(/[^a-z0-9_]/gi, "_");

      const emoji = await interaction.guild.emojis.create({
        attachment: finalBuf,
        name
      });

      interaction.editReply(`Added ${emoji.toString()}  \`:${emoji.name}:\``);
    } catch (err) {
      console.error("Error adding 7TV emote:", err);
      interaction.editReply("Something went wrong trying to add that emote.");
    }
  },

  data: new SlashCommandBuilder()
    .setName("add7tv")
    .setDescription("Add a 7TV emote to this server")
    .addStringOption((option) =>
      option
        .setName("link")
        .setDescription("Full 7TV emote URL")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("name").setDescription("Custom emoji name (optional)")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
};
