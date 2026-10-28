const { ActivityType } = require("discord.js");

module.exports = (client) => {
  client.user.setPresence({
    status: "online",
    activities: [
      {
        type: ActivityType.Custom,
        name: "Custom Status", // discord ignores it for custom statuses but requires it
        state: "💜 be good and wait for v2 · /help",
      },
    ],
  });
};
