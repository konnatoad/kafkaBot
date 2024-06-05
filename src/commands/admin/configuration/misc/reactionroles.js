const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const reaction = require("../../../../schemas/reactions");

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("reaction-roles")
    .setDescription("Manage your reaction roles system")
    .addSubcommand((command) =>
      command
        .setName("add")
        .setDescription("Add a reaction role to a message")
        .addStringOption((option) =>
          option
            .setName("message-id")
            .setDescription("The message to react to")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("The emoji to react with")
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("The role you want to give")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((command) =>
      command
        .setName("remove")
        .setDescription("Remove a reaction role from a message")
        .addStringOption((option) =>
          option
            .setName("message-id")
            .setDescription("The message to react to")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("The emoji to react with")
            .setRequired(true)
        )
    ),

  run: async ({ interaction }) => {
    const { options, guild, channel } = interaction;
    const sub = options.getSubcommand();
    const emoji = options.getString("emoji");

    let e;
    const message = await channel.messages
      .fetch(options.getString("message-id"))
      .catch((err) => {
        e = err;
      });

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
      return await interaction.reply({
        content: "you dont have permissions to use this system",
        ephemeral: true,
      });
    if (e)
      return await interaction.reply({
        content: `be sure to get a message from ${channel}!`,
        ephemeral: true,
      });

    const data = await reaction.findOne({
      Guild: guild.id,
      Message: message.id,
      Emoji: emoji,
    });

    switch (sub) {
      case "add":
        if (data) {
          return await interaction.reply({
            content: `It looks like you already have this reaction setup using ${emoji} on this message`,
            ephemeral: true,
          });
        } else {
          const role = options.getRole("role");
          await reaction.create({
            Guild: guild.id,
            Message: message.id,
            Emoji: emoji,
            Role: role.id,
          });

          const embed = new EmbedBuilder()
            .setColor("Blurple")
            .setDescription(
              `I have added a reaction role to ${message.url} with ${emoji} and the role ${role}`
            );

          await message.react(emoji).catch((err) => {});

          await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        break;
      case "remove":
        if (!data) {
          return await interaction.reply({
            content: `It doesnt look like that reaction role exists`,
            ephemeral: true,
          });
        } else {
          await reaction.deleteMany({
            Guild: guild.id,
            Message: message.id,
            Emoji: emoji,
          });

          const embed = new EmbedBuilder()
            .setColor("Blurple")
            .setDescription(
              `I have removed the reaction role from ${message.url} with ${emoji}`
            );

          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
  },
};
