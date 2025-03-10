const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const log = require("../../../../schemas/deletemsglog");

module.exports = {
  deleted: false,

  data: new SlashCommandBuilder()
    .setName("delete-message-log")
    .setDescription("Delete message log")
    .addSubcommand((command) =>
      command
        .setName("setup")
        .setDescription("Setup the delete message log system")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to log deleted messages in to")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((command) =>
      command
        .setName("disable")
        .setDescription("disable the delete message log system")
    ),
  run: async ({ interaction }) => {
    const { options } = interaction;
    const sub = options.getSubcommand();
    var data = await log.findOne({ Guild: interaction.guild.id });

    async function sendMessage(message) {
      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setDescription(message);

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    switch (sub) {
      case "setup":
        if (data) {
          await sendMessage(`Looks like you already have this system setup`);
        } else {
          var channel = options.getChannel("channel");
          await log.create({
            Guild: interaction.guild.id,
            Channel: channel.id,
          });

          await sendMessage(
            `message logging system has been setup to channel ${channel}`
          );
        }
        break;
      case "disable":
        if (!data) {
          await sendMessage(`this system has yet to be setup`);
        } else {
          await log.deleteOne({ Guild: interaction.guild.id });
          await sendMessage(`message logging has been disabled!`);
        }
    }
  },
};
