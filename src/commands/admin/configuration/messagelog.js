const { logChannelCommand } = require("../../../utils/messageLogs");

module.exports = logChannelCommand({
  name: "message-log",
  description: "Log deleted and edited messages",
  logs: [
    {
      group: "deleted",
      system: "delete message log",
      logged: "deleted",
      model: require("../../../schemas/deletemsglog"),
    },
    {
      group: "edited",
      system: "message update log",
      logged: "edited",
      model: require("../../../schemas/messageupdate"),
    },
  ],
});
