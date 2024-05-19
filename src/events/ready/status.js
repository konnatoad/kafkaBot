const { ActivityType } = require("discord.js");

module.exports = (client) => {
  client.user.setPresence({
    status: "dnd",
    activities: [
      {
        type: ActivityType.Listening,
        name: "you /beg",
        state: "/daily for free starter grains.",
      },
    ],
  });
};
