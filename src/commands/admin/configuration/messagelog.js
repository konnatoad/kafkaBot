const { logChannelCommand } = require("../../../utils/messageLogs");

module.exports = logChannelCommand({
  name: "message-log",
  description: "log deleted and edited messages",
  logs: [
    {
      group: "deleted",
      logged: "deleted",
      model: require("../../../schemas/deletemsglog"),
    },
    {
      group: "edited",
      logged: "edited",
      model: require("../../../schemas/messageupdate"),
    },
  ],
});
