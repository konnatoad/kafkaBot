const { logChannelCommand } = require("../../../../utils/messageLogs");

module.exports = logChannelCommand({
  name: "message-update-log",
  description: "Logs edited messages",
  system: "message update log",
  logged: "edited",
  model: require("../../../../schemas/messageupdate"),
});
