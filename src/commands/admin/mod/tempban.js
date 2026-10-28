const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const Ban = require("../../../schemas/banschema");
const logger = require("../../../extra/logger");
const { whyCantModerate } = require("../../../utils/moderation");

const MINUTES_PER = {
  weeks: 7 * 24 * 60,
  days: 24 * 60,
  hours: 60,
  minutes: 1,
};

const data = new SlashCommandBuilder()
  .setName("tempban")
  .setDescription("Temporarily ban a user")
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addUserOption((option) =>
    option.setName("user").setDescription("The user to ban").setRequired(true),
  );
for (const unit of Object.keys(MINUTES_PER)) {
  data.addIntegerOption((option) =>
    option.setName(unit).setDescription(`The number of ${unit}`).setMinValue(0),
  );
}
data.addStringOption((option) =>
  option.setName("reason").setDescription("The reason for the ban"),
);

module.exports = {
  data,
  run: async ({ interaction }) => {
    const user = interaction.options.getUser("user", true);
    const member = interaction.options.getMember("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    const amounts = Object.keys(MINUTES_PER)
      .map((unit) => [unit, interaction.options.getInteger(unit) ?? 0])
      .filter(([, amount]) => amount > 0);
    const totalMinutes = amounts.reduce(
      (total, [unit, amount]) => total + amount * MINUTES_PER[unit],
      0,
    );
    if (totalMinutes === 0) {
      return interaction.reply({
        content: "Give the ban a length: weeks, days, hours or minutes.",
        flags: MessageFlags.Ephemeral,
      });
    }
    const duration = amounts
      .map(
        ([unit, amount]) =>
          `${amount} ${amount === 1 ? unit.slice(0, -1) : unit}`,
      )
      .join(", ");

    const refusal = member && whyCantModerate(interaction, member, "ban");
    if (refusal) {
      return interaction.reply({
        content: refusal,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    // DM first: once banned there may be no shared server left to DM through
    const dmEmbed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("You Have Been Temporarily Banned")
      .setDescription(
        `You have been temporarily banned from **${interaction.guild.name}**.`,
      )
      .addFields(
        { name: "Duration", value: `\`${duration}\`` },
        { name: "Reason", value: `\`${reason}\`` },
        { name: "Server", value: `\`${interaction.guild.name}\`` },
      )
      .setTimestamp();
    await user.send({ embeds: [dmEmbed] }).catch((err) => {
      if (err.code !== 50007) logger.error("tempban: failed to DM user:", err);
    });

    try {
      await interaction.guild.members.ban(user, { reason });
    } catch (error) {
      logger.error(`tempban: failed to ban ${user.id}: ${error}`);
      return interaction.editReply(
        `Failed to ban **${user.tag}**: ${error.message}`,
      );
    }

    await Ban.create({
      userId: user.id,
      expirationTime: new Date(Date.now() + totalMinutes * 60_000),
      guildId: interaction.guildId,
    });

    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("User Temporarily Banned")
      .setDescription(
        `**${user.tag}** has been temporarily banned from the server.`,
      )
      .addFields(
        { name: "Duration", value: `\`${duration}\`` },
        { name: "Reason", value: `\`${reason}\`` },
        { name: "User ID", value: `\`${user.id}\`` },
      )
      .setFooter({
        text: `Banned by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  },
};
