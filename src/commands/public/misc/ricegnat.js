const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("rice")
    .setDescription("fun images")
    .setNSFW(true)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  run: async ({ interaction }) => {
    if (!interaction.channel.nsfw)
      return interaction.reply(
        "This channel is not NSFW and this command cannot be ran here!"
      );
    let files = fs.readdirSync("src/static/ricegnat");
    let picture = files[Math.floor(Math.random() * files.length)];
    await interaction.reply({
      files: [`./src/static/ricegnat/${picture}`],
    });
  },
  devOnly: false,
  testOnly: true,
};
