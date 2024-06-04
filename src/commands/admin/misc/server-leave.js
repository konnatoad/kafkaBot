const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  deleted: false,
  devOnly: true,
  testOnly: true,
  /**
   * This is the data for the server-leave slash command.
   * It sets the name, description, and options for the command.
   */
  data: new SlashCommandBuilder()
    .setName("server-leave")
    .setDescription("Leave a guild")
    /**
     * This option is required and allows the user to input the ID or name of the guild to leave.
     */
    .addStringOption((option) =>
      option
        .setName("guild")
        .setDescription("The ID or the name of the guild to leave")
        .setRequired(true)
    )
    /**
     * This sets the default member permissions required to use this command to Administrator.
     */
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  /**
   * This is the run function for the server-leave command.
   * It takes an interaction and a client as parameters.
   *
   * @param {Interaction} interaction
   * @param {Client} client
   */
  run: async ({ interaction, client }) => {
    const { options } = interaction;
    const guild = options.getString("guild");
    /**
     * Defer the interaction reply to make it ephemeral.
     */
    await interaction.deferReply({ ephemeral: true });

    /**
     * This function sends a message to the interaction.
     * It takes a message as a parameter and creates an embed with that message.
     *
     * @param {string} message
     */
    async function sendMessage(message) {
      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setDescription(message);

      await interaction.editReply({ embeds: [embed] });
    }

    /**
     * Try to fetch the guild with the provided ID or name.
     */
    var fetchedGuild = await client.guilds.fetch(guild).catch((err) => {});

    var guilds = [];

    /**
     * If the guild is not found by ID, try to find it by name.
     */
    if (!fetchedGuild) {
      var gds = await client.guilds.fetch();
      await gds.forEach(async (value) => {
        if (value.name == guild) {
          guilds.push({ name: value.name, id: value.id });
        }
      });
    }

    /**
     * If the guild is found, leave it and send a success message.
     */
    if (fetchedGuild) {
      await fetchedGuild.leave();
      await sendMessage(`I have left ${fetchedGuild.name}`).catch((err) => {});
    } else {
      /**
       * If the guild is not found, check if there are multiple guilds with the same name.
       */
      if (guilds.length > 1) {
        await sendMessage(
          `\`${guild}\` is a name that multiple servers I'm in have! Try using the guild ID to narrow down this search`
        );
      } else if (guilds.length == 0) {
        /**
         * If no guilds are found, send an error message.
         */
        await sendMessage(`I'm not in a guild matching \`${guild}\``);
      } else {
        /**
         * If one guild is found, leave it and send a success message.
         */
        fetchedGuild = await client.guilds.fetch(guilds[0].id);
        await fetchedGuild.leave();
        await sendMessage(`I have left ${fetchedGuild.name}`).catch(
          (err) => {}
        );
      }
    }
  },
};
