const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const Ban = require("../../../schemas/banschema");

const slashCommand = new SlashCommandBuilder()
  .setName("tempban")
  .setDescription("Temporarily ban a user")
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addUserOption((option) =>
    option.setName("user").setDescription("The user to ban").setRequired(true)
  )
  .addIntegerOption((option) =>
    option.setName("weeks").setDescription("The number of weeks")
  )
  .addIntegerOption((option) =>
    option.setName("days").setDescription("The number of days")
  )
  .addIntegerOption((option) =>
    option.setName("hours").setDescription("The number of hours")
  )
  .addIntegerOption((option) =>
    option.setName("minutes").setDescription("The number of minutes")
  )
  .addStringOption((option) =>
    option.setName("reason").setDescription("The reason for the ban")
  );

module.exports = {
  data: slashCommand,
  run: async ({ interaction }) => {
    const user = interaction.options.getUser("user");
    const durationOptions = ["weeks", "days", "hours", "minutes"];
    const providedDurations = durationOptions.filter(
      (option) => interaction.options.getInteger(option) !== null
    );
    const durationValues = providedDurations.map((option) =>
      interaction.options.getInteger(option)
    );
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    // Ensure at least one duration option is provided
    if (providedDurations.length === 0) {
      await interaction.reply({
        content: "You must specify at least one duration option.",
        ephemeral: true,
      });
      return;
    }

    // Calculate total duration in minutes
    const totalDuration = providedDurations.reduce((total, option, index) => {
      const value = durationValues[index];
      switch (option) {
        case "weeks":
          return total + value * 7 * 24 * 60;
        case "days":
          return total + value * 24 * 60;
        case "hours":
          return total + value * 60;
        case "minutes":
          return total + value;
        default:
          return total;
      }
    }, 0);

    // Calculate expiration time
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + totalDuration);

    await Ban.create({
      userId: user.id,
      expirationTime,
      guildId: interaction.guildId,
      reason,
    });

    const formattedDuration = providedDurations
      .map((option, index) => {
        const value = durationValues[index];
        if (value === 0) return null;
        return `${value} ${value === 1 ? option.slice(0, -1) : option}`;
      })
      .filter((duration) => duration !== null)
      .join(", ");

    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("User Temporarily Banned")
      .setDescription(
        `**${user.tag}** has been temporarily banned from the server.`
      )
      .addFields(
        { name: "Duration", value: `\`${formattedDuration}\`` },
        { name: "Reason", value: `\`${reason}\`` },
        { name: "User ID", value: `\`${user.id}\`` }
      )
      .setFooter({
        text: `Banned by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const dmEmbed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("You Have Been Temporarily Banned")
      .setDescription(
        `You have been temporarily banned from **${interaction.guild.name}**.`
      )
      .addFields(
        { name: "Duration", value: `\`${formattedDuration}\`` },
        { name: "Reason", value: `\`${reason}\`` },
        { name: "Server", value: `\`${interaction.guild.name}\`` }
      )
      .setTimestamp();

    try {
      await user.send({ embeds: [dmEmbed] });
    } catch (error) {
      console.error(`Could not send DM to ${user.tag}: ${error.message}`);
    }

    await interaction.guild.members.ban(user, { reason });
  },
};
