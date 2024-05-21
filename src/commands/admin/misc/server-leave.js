const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  deleted: false,
  devOnly: true,
  testOnly: true,
  data: new SlashCommandBuilder()
    .setName("server-leave")
    .setDescription("Leave a guild")
    .addStringOption((option) =>
      option
        .setName("guild")
        .setDescription("The ID or the name of the guild to leave")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  run: async ({ interaction, client }) => {
    const { options } = interaction;
    const guild = options.getString("guild");
    await interaction.deferReply({ ephemeral: true });

    async function sendMessage(message) {
      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setDescription(message);

      await interaction.editReply({ embeds: [embed] });
    }

    var fetchedGuild = await client.guilds.fetch(guild).catch((err) => {});
    var guilds = [];

    if (!fetchedGuild) {
      var gds = await client.guilds.fetch();
      await gds.forEach(async (value) => {
        if (value.name == guild) {
          guilds.push({ name: value.name, id: value.id });
        }
      });
    }

    if (fetchedGuild) {
      await fetchedGuild.leave();
      await sendMessage(`I have left ${fetchedGuild.name}`).catch((err) => {});
    } else {
      if (guilds.lenght > 1) {
        await sendMessage(
          `\`${guild}\` is a name that multiple servers I'm in have! Try using the guild ID to narrow down this search`
        );
      } else if (guilds.length == 0) {
        await sendMessage(`I'm not in a guild matching \`${guild}\``);
      } else {
        fetchedGuild = await client.guilds.fetch(guilds[0].id);
        await fetchedGuild.leave();
        await sendMessage(`I have left ${fetchedGuild.name}`).catch(
          (err) => {}
        );
      }
    }
  },
};
