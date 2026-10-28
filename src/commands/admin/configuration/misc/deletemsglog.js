const { logChannelCommand } = require("../../../../utils/messageLogs");

module.exports = logChannelCommand({
  name: "delete-message-log",
  description: "Delete message log",
  system: "delete message log",
  logged: "deleted",
  model: require("../../../../schemas/deletemsglog"),
});
