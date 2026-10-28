const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const reaction = require("../../../../schemas/reactions");
const logger = require("../../../../extra/logger");
const { whyBotCantGive } = require("../../../../utils/roles");

module.exports = {
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
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("The emoji to react with")
            .setRequired(true),
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("The role you want to give")
            .setRequired(true),
        ),
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
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("The emoji to react with")
            .setRequired(true),
        ),
    ),

  run: async ({ interaction }) => {
    const { options, guild, channel } = interaction;
    const emoji = options.getString("emoji").trim();
    const reply = (content) =>
      interaction.reply({ content, flags: MessageFlags.Ephemeral });

    const message = await channel.messages
      .fetch(options.getString("message-id"))
      .catch(() => null);
    if (!message) {
      return reply(
        `Couldn't find that message in ${channel}. Run this in the channel the message is in.`,
      );
    }

    if (options.getSubcommand() === "remove") {
      const { deletedCount } = await reaction.deleteMany({
        Guild: guild.id,
        Message: message.id,
        Emoji: emoji,
      });
      return reply(
        deletedCount
          ? `I have removed the reaction role from ${message.url} with ${emoji}`
          : "It doesn't look like that reaction role exists",
      );
    }

    const role = options.getRole("role");
    const refusal = whyBotCantGive(guild, role);
    if (refusal) return reply(refusal);

    // reacting first proves the emoji is real and usable here; what Discord
    // reports back is exactly what reactions to it will look like
    let reacted;
    try {
      reacted = await message.react(emoji);
    } catch (err) {
      logger.warn(
        `reaction-roles: can't react with ${emoji} in guild ${guild.id}: ${err}`,
      );
      return reply(
        `I can't react with ${emoji} there. Use an emoji from this server or a normal one, and check I can add reactions in ${channel}.`,
      );
    }
    const stored = reacted.emoji.toString();

    if (
      await reaction.exists({
        Guild: guild.id,
        Message: message.id,
        Emoji: stored,
      })
    ) {
      return reply(
        `It looks like you already have this reaction setup using ${emoji} on this message`,
      );
    }
    await reaction.create({
      Guild: guild.id,
      Message: message.id,
      Emoji: stored,
      Role: role.id,
    });
    return reply("Successfully added reaction role to the message.");
  },
};
