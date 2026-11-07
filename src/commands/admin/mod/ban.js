const logger = require("../../../extra/logger");
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const Ban = require("../../../schemas/banschema");
const { whyCantModerate } = require("../../../utils/moderation");

const MINUTES_PER = {
  weeks: 7 * 24 * 60,
  days: 24 * 60,
  hours: 60,
  minutes: 1,
};

const data = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("bans a user, for good or for a set time")
  .addUserOption((option) =>
    option
      .setName("target-user")
      .setDescription("user you want to ban")
      .setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addStringOption((option) =>
    option.setName("reason").setDescription("reason for the ban"),
  );
for (const unit of Object.keys(MINUTES_PER)) {
  data.addIntegerOption((option) =>
    option
      .setName(unit)
      .setDescription(
        `unban after this many ${unit} (leave every length empty to ban for good)`,
      )
      .setMinValue(1),
  );
}

// No length given means a permanent ban.
function banLength(options) {
  const amounts = Object.keys(MINUTES_PER)
    .map((unit) => [unit, options.getInteger(unit) ?? 0])
    .filter(([, amount]) => amount > 0);
  const minutes = amounts.reduce(
    (total, [unit, amount]) => total + amount * MINUTES_PER[unit],
    0,
  );
  const text = amounts
    .map(
      ([unit, amount]) =>
        `${amount} ${amount === 1 ? unit.slice(0, -1) : unit}`,
    )
    .join(", ");
  return { minutes, text };
}

// A new ban replaces a temporary one still running, so the old unban can't
// lift it early (or at all, when it's now permanent).
async function saveUnban(guildId, userId, minutes) {
  await Ban.deleteMany({ guildId, userId });
  if (!minutes) return;
  await Ban.create({
    userId,
    expirationTime: new Date(Date.now() + minutes * 60_000),
    guildId,
  });
}

const banEmbed = (user, reason) =>
  new EmbedBuilder()
    .setTitle("**Ban**")
    .setColor("Red")
    .setDescription(`User ${user} was banned.`)
    .addFields({ name: "Reason:", value: reason })
    .setTimestamp()
    .setFooter({ text: "Perm ban", iconURL: "https://vou.s-ul.eu/ts9RQjxl" });

const tempBanEmbed = (interaction, user, length, reason) =>
  new EmbedBuilder()
    .setColor("#ff0000")
    .setTitle("User Temporarily Banned")
    .setDescription(
      `**${user.tag}** has been temporarily banned from the server.`,
    )
    .addFields(
      { name: "Duration", value: `\`${length.text}\`` },
      { name: "Reason", value: `\`${reason}\`` },
      { name: "User ID", value: `\`${user.id}\`` },
    )
    .setFooter({
      text: `Banned by ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setTimestamp();

const tempBanDm = (guild, length, reason) =>
  new EmbedBuilder()
    .setColor("#ff0000")
    .setTitle("You Have Been Temporarily Banned")
    .setDescription(`You have been temporarily banned from **${guild.name}**.`)
    .addFields(
      { name: "Duration", value: `\`${length.text}\`` },
      { name: "Reason", value: `\`${reason}\`` },
      { name: "Server", value: `\`${guild.name}\`` },
    )
    .setTimestamp();

module.exports = {
  data,
  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "run this inside a server",
        flags: MessageFlags.Ephemeral,
      });
    }
    const user = interaction.options.getUser("target-user", true);
    // null when they already left; Discord still lets us ban them by ID
    const member = interaction.options.getMember("target-user");
    const reason =
      interaction.options.getString("reason") || "no reason provided";
    const length = banLength(interaction.options);

    await interaction.deferReply();

    const refusal = member && whyCantModerate(interaction, member, "ban");
    if (refusal) return interaction.editReply(refusal);

    // DM first: once banned there may be no shared server left to DM through
    if (length.minutes) {
      const dm = tempBanDm(interaction.guild, length, reason);
      await user.send({ embeds: [dm] }).catch((err) => {
        if (err.code !== 50007) logger.error("ban: failed to DM user:", err);
      });
    }

    try {
      await interaction.guild.members.ban(user, { reason });
    } catch (error) {
      logger.error(`ban: failed to ban ${user.id}: ${error}`);
      return interaction.editReply(`failed to ban ${user}: ${error.message}`);
    }

    try {
      await saveUnban(interaction.guildId, user.id, length.minutes);
    } catch (error) {
      logger.error(`ban: failed to save the unban of ${user.id}: ${error}`);
      if (length.minutes) {
        return interaction.editReply(
          `${user} is banned, but i couldn't save when to unban them, so unban them by hand`,
        );
      }
    }

    const embed = length.minutes
      ? tempBanEmbed(interaction, user, length, reason)
      : banEmbed(user, reason);
    await interaction.editReply({ embeds: [embed] });
  },
};
