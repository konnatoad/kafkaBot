const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  deleted: false,
  devOnly: true,
  testOnly: true,
  /**
   * This is the data for the server-list slash command.
   * It sets the name, description, and options for the command.
   */
  data: new SlashCommandBuilder()
    .setName("server-list")
    .setDescription("Get a list of all the servers the bot is in")
    /**
     * This sets the default member permissions required to use this command to Administrator.
     */
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  /**
   * This is the run function for the server-list command.
   * It takes an interaction and a client as parameters.
   *
   * @param {Interaction} interaction
   * @param {Client} client
   */
  run: async ({ interaction, client }) => {
    /**
     * Defer the interaction reply to make it ephemeral.
     */
    await interaction.deferReply({ ephemeral: true });

    /**
     * This function sends a message to the interaction.
     * It takes a message and a key as parameters and creates an embed with that message.
     *
     * @param {string} message
     * @param {string} key
     */
    async function sendMessage(message, key) {
      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setDescription(message);

      if (key) {
        /**
         * Create a button with a link to the sourcebin.
         */
        const button = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setURL(`https://sourceb.in/${key}`)
            .setLabel(`Server List`)
        );

        await interaction.editReply({ embeds: [embed], components: [button] });
      } else {
        await interaction.editReply({ embeds: [embed] });
      }
    }

    /**
     * Initialize the content string with the bot's username and a description.
     */
    var content = `${client.user.username}'s server list:\n\n`;

    /**
     * Fetch all guilds the bot is in.
     */
    var guilds = await client.guilds.fetch();

    /**
     * Iterate over each guild and add its name and ID to the content string.
     */
    await guilds.forEach(async (guild) => {
      content += `Server: ${guild.name}, ID: ${guild.id}\n`;
    });

    /**
     * Add a note to the content string about the limitation of 200 guilds.
     */
    content +=
      "If your bot is in more than 200+ guilds, you will only see ~200 of them on this list.";

    /**
     * Post the content to sourceb.in and get the key.
     */
    var listBin = await fetch("https://sourceb.in/api/bins", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: [
          {
            content: content,
          },
        ],
      }),
    });

    if (listBin.ok) {
      /**
       * Get the key from the response.
       */
      var { key } = await listBin.json();

      /**
       * Send a message with the server list and a link to the sourcebin.
       */
      await sendMessage(
        `**My server list:**\n\nI am currently in \`${client.guilds.cache.size}\` servers-- I have compiled this list into a sourcebin below consisting of the server names and IDs`,
        key
      );
    } else {
      /**
       * Send an error message if the request to sourceb.in fails.
       */
      await sendMessage("Failed to load server list");
    }
  },
};
