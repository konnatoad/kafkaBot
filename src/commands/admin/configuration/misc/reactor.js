const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
  ChannelType,
} = require("discord.js");
const reactor = require("../../../../schemas/reactorschema");

const TEXT_CHANNELS = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
// a custom emoji like <:name:123> / <a:name:123>, or text with an emoji character
// in it; flags (🇫🇮) and keycaps (1️⃣) are built from characters of their own
const looksLikeEmoji = (text) =>
  /^<a?:\w+:\d+>$/.test(text) ||
  /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u.test(text);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reactor")
    .setDescription("Manage your auto reaction system")
    .addSubcommand((command) =>
      command
        .setName("setup")
        .setDescription("Setup your auto reactor system")
        .addStringOption((option) =>
          option
            .setName("emojis")
            .setDescription("The emojis you want to auto react with")
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription(
              "The channel you want your auto reactor system to be in",
            )
            .addChannelTypes(...TEXT_CHANNELS)
            .setRequired(false),
        ),
    )
    .addSubcommand((command) =>
      command
        .setName("disable")
        .setDescription("Disable your auto reactor for one channel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to remove from the auto reactor")
            .addChannelTypes(...TEXT_CHANNELS)
            .setRequired(true),
        ),
    )
    .addSubcommand((command) =>
      command
        .setName("remove-all")
        .setDescription(
          "Remove all of your auto reactor channels in the entire server",
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  run: async ({ interaction }) => {
    const reply = (text, { embed = false } = {}) =>
      interaction.reply({
        ...(embed
          ? {
              embeds: [
                new EmbedBuilder().setColor("Blurple").setDescription(text),
              ],
            }
          : { content: text }),
        flags: MessageFlags.Ephemeral,
      });
    const guild = { Guild: interaction.guildId };
    const channel =
      interaction.options.getChannel("channel") || interaction.channel;

    switch (interaction.options.getSubcommand()) {
      case "setup": {
        if (await reactor.exists({ ...guild, Channel: channel.id })) {
          return reply(`You already have this system setup for ${channel}`);
        }
        // any run of spaces separates emojis
        const emojis = interaction.options
          .getString("emojis")
          .split(/\s+/)
          .filter(Boolean);
        const notEmoji = emojis.filter((text) => !looksLikeEmoji(text));
        if (!emojis.length || notEmoji.length) {
          return reply(
            `These aren't emojis: ${notEmoji.join(" ") || "(nothing given)"}. Separate emojis with spaces.`,
          );
        }
        await reactor.create({ ...guild, Channel: channel.id, Emojis: emojis });
        return reply(
          `The auto reactor system has been enabled for ${channel}`,
          { embed: true },
        );
      }
      case "disable": {
        const { deletedCount } = await reactor.deleteMany({
          ...guild,
          Channel: channel.id,
        });
        return deletedCount
          ? reply(`The auto reactor system has been disabled for ${channel}`, {
              embed: true,
            })
          : reply(`You don't have this system setup yet for ${channel}`);
      }
      case "remove-all": {
        const { deletedCount } = await reactor.deleteMany(guild);
        return deletedCount
          ? reply(
              "The auto reactor system has been disabled for the entire server",
              {
                embed: true,
              },
            )
          : reply(
              "It looks like this system has not been yet setup in this server",
            );
      }
    }
  },
};
