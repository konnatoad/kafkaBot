const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");
const logger = require("../../../extra/logger");
const { claimCooldown } = require("../../../utils/cooldowns");

const REP_AMOUNT = 25;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rep")
    .setDescription(
      `Give ${REP_AMOUNT} rice grains to another user once per day`,
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to give rice grains to")
        .setRequired(true),
    ),
  run: async ({ interaction }) => {
    try {
      const giver = interaction.user;
      const receiver = interaction.options.getUser("user");

      if (giver.id === receiver.id) {
        return interaction.reply("You cannot give rice grains to yourself!");
      }

      // one rep per calendar day, so the cooldown runs until midnight
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const left = await claimCooldown(giver.id, "rep", midnight - Date.now());
      if (left) {
        const hours = Math.floor(left / (60 * 60 * 1000));
        const minutes = Math.floor((left % (60 * 60 * 1000)) / (60 * 1000));
        return interaction.reply({
          content: `You can use this command again in ${hours} hours ${minutes} minutes.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await UserProfile.updateOne(
        { userId: receiver.id, Guild: interaction.guildId },
        { $inc: { balance: REP_AMOUNT } },
        { upsert: true },
      );

      return interaction.reply(
        `${giver} has given their daily reputation bonus to ${receiver}!`,
      );
    } catch (error) {
      logger.error(`error handling /rep: ${error}`);
    }
  },
};
