const { ActivityType } = require("discord.js");

module.exports = (client) => {
  client.user.setPresence({
    status: "online",
    activities: [
      {
        type: ActivityType.Listening,
        name: "you /beg",
        state: "/help for list of commands.",
      },
    ],
  });
};
