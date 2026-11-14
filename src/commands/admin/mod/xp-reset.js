const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const levelSchema = require("../../../schemas/level");

const data = new SlashCommandBuilder()
  .setName("xp-reset")
  .setDescription("Reset XP for the whole server or one member")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) =>
    subcommand.setName("server").setDescription("Reset ALL of the server's XP"),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("user")
      .setDescription("Reset one member's XP")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The member you want to clear the xp of")
          .setRequired(true),
      ),
  );

// XP belongs to a server; in DMs guildId is null, and { Guild: null }
// would match every level saved without a server
const notInGuild = (interaction) =>
  interaction.reply({
    content: "Run this inside a server.",
    flags: MessageFlags.Ephemeral,
  });

const server = async ({ interaction }) => {
  if (!interaction.inGuild()) return notInGuild(interaction);

  const { deletedCount } = await levelSchema.deleteMany({
    Guild: interaction.guildId,
  });

  const embed = new EmbedBuilder()
    .setColor("DarkPurple")
    .setDescription(
      `The xp system in your server has been reset! (${deletedCount} member(s))`,
    );
  await interaction.reply({ embeds: [embed] });
};

const user = async ({ interaction }) => {
  if (!interaction.inGuild()) return notInGuild(interaction);
  const target = interaction.options.getUser("user");

  const { deletedCount } = await levelSchema.deleteMany({
    Guild: interaction.guildId,
    User: target.id,
  });

  if (!deletedCount) {
    return interaction.reply({
      content: `**${target}** has no xp to reset`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const embed = new EmbedBuilder()
    .setColor("DarkPurple")
    .setDescription(`**${target}**'s xp has been reset!`);
  await interaction.reply({ embeds: [embed] });
};

module.exports = { data, subcommands: { server, user } };
