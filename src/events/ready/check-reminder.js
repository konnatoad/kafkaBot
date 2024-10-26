const UserProfile = require("../../schemas/UserProfile");

module.exports = (client) => {
  checkReminders();
  setInterval(checkReminders, 60000); // Check every minute

  async function checkReminders() {
    try {
      const userProfiles = await UserProfile.find();

      for (const userProfile of userProfiles) {
        const { userId, Guild, reminderTime } = userProfile;

        // If the user has a reminder time set
        if (reminderTime) {
          const currentTime = new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }); // Get current time in HH:MM format (24-hour)

          // Check if the current time matches the reminder time
          if (currentTime === reminderTime) {
            const targetGuild =
              client.guilds.cache.get(Guild) ||
              (await client.guilds.fetch(Guild));

            if (!targetGuild) {
              console.log(`Guild not found for userId: ${userId}`);
              continue;
            }

            const targetMember = await targetGuild.members
              .fetch(userId)
              .catch(() => null);
            if (!targetMember) {
              console.log(`Member not found for userId: ${userId}`);
              continue;
            }

            const targetChannel = await targetMember
              .send(
                `Hey <@${userId}>, it's time for your daily reminder to collect your dailies!` //sabi saa tehä uudet ja kovat messaget
              )
              .catch(() => null);

            if (!targetChannel) {
              console.log(`Failed to send reminder to userId: ${userId}`);
              continue;
            }

            console.log(
              `Reminder sent to ${targetMember.user.tag} in ${targetGuild.name}`
            );
          }
        }
      }
    } catch (error) {
      console.error(`Error in checkReminders:\n`, error);
    }
  }
};
