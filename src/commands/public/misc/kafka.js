const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("kafka")
    .setDescription("Sends random kafka picture.")
    .setNSFW(true),

  run: async ({ interaction }) => {
    if (!interaction.channel.nsfw)
      return interaction.reply({
        content:
          "This channel is not NSFW and this command cannot be ran here!",
        ephemeral: true,
      });
    let files = fs.readdirSync("src/static/kafka");
    let picture = files[Math.floor(Math.random() * files.length)];
    await interaction.reply({
      files: [`./src/static/kafka/${picture}`],
    });
  },
  testOnly: false,
};
