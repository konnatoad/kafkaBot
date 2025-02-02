const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const Cooldown = require("../../../schemas/Cooldown");
const UserProfile = require("../../../schemas/UserProfile");

module.exports = {
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("rep")
    .setDescription("Give 25 rice grains to another user once per day")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to give rice grains to")
        .setRequired(true)
    ),
  run: async ({ interaction }) => {
    try {
      const giver = interaction.user;
      const receiver = interaction.options.getUser("user");
      const commandName = "rep";
      const amountToTransfer = 25; // Fixed amount

      if (giver.id === receiver.id) {
        return interaction.reply("You cannot give rice grains to yourself!");
      }

      const currentDate = new Date();

      const existingCooldown = await Cooldown.findOne({
        commandName: commandName,
        userId: giver.id,
      });

      // Get the end date of the current cooldown or set it to null if none exists
      const cooldownEndDate = existingCooldown ? existingCooldown.endsAt : null;

      // Set the cooldown end date to midnight of the next day
      const nextDayStart = new Date(currentDate);
      nextDayStart.setDate(nextDayStart.getDate() + 1);
      nextDayStart.setHours(0, 0, 0, 0);

      if (cooldownEndDate && cooldownEndDate > currentDate) {
        const cooldownDuration = cooldownEndDate - currentDate;

        // Calculate hours, minutes, and seconds
        const hours = Math.floor(cooldownDuration / (1000 * 60 * 60));
        const minutes = Math.floor(
          (cooldownDuration % (1000 * 60 * 60)) / (1000 * 60)
        );

        // Format cooldown duration into a human-readable format
        const formattedCooldownDuration = `${hours} hours ${minutes} minutes`;

        return interaction.reply({
          content: `You can use this command again in ${formattedCooldownDuration}.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const newCooldownEnd = nextDayStart.getTime();

      if (existingCooldown) {
        existingCooldown.endsAt = newCooldownEnd;
        await existingCooldown.save();
      } else {
        const newCooldown = new Cooldown({
          commandName: commandName,
          userId: giver.id,
          endsAt: newCooldownEnd,
        });
        await newCooldown.save();
      }

      let receiverProfile = await UserProfile.findOne({
        userId: receiver.id,
        Guild: interaction.guildId,
      });
      if (!receiverProfile) {
        receiverProfile = new UserProfile({
          userId: receiver.id,
          Guild: interaction.guildId,
          balance: 0,
        });
      }

      receiverProfile.balance += amountToTransfer;

      await receiverProfile.save();

      return interaction.reply({
        content: `${giver.toString()} has given their daily reputation bonus to ${receiver.toString()}!`,
      });
    } catch (error) {
      console.log(`Error handling /rep: ${error}`);
    }
  },
};
