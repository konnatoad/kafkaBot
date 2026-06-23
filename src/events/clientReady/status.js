const { ActivityType } = require("discord.js");

module.exports = (client) => {
  client.user.setPresence({
    status: "online",
    activities: [
      {
        type: ActivityType.Watching,
        name: "/help",
        state: "/beg",
      },
    ],
  });
};
