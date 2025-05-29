const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
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
        flags: MessageFlags.Ephemeral,
      });
    if (e)
      return await interaction.reply({
        content: `be sure to get a message from ${channel}!`,
        flags: MessageFlags.Ephemeral,
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
            flags: MessageFlags.Ephemeral,
          });
        } else {
          const role = options.getRole("role");
          await reaction.create({
            Guild: guild.id,
            Message: message.id,
            Emoji: emoji, // Store emoji as it is (whether normal or animated)
            Role: role.id,
          });

          await message.react(emoji).catch((err) => { });

          await interaction.reply({
            content: `Successfully added reaction role to the message.`,
            flags: MessageFlags.Ephemeral,
          });
        }
        break;

      case "remove":
        if (!data) {
          return await interaction.reply({
            content: `It doesn't look like that reaction role exists`,
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await reaction.deleteMany({
            Guild: guild.id,
            Message: message.id,
            Emoji: emoji,
          });

          await interaction.reply({
            content: `I have removed the reaction role from ${message.url} with ${emoji}`,
            flags: MessageFlags.Ephemeral,
          });
        }
        break;
    }
  },
};
