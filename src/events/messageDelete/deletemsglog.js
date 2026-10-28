const deleteLog = require("../../schemas/deletemsglog");
const logger = require("../../extra/logger");
const { isUnloggable, postToLog, quoted } = require("../../utils/messageLogs");

module.exports = async (message) => {
  if (isUnloggable(message)) return;

  const deletedAt = `<t:${Math.floor(Date.now() / 1000)}:R>`;
  await postToLog(deleteLog, message, {
    title: "New message deleted!",
    description: `This message was deleted ${deletedAt} and is being logged for moderative purposes`,
    fields: [{ name: "Message content", value: quoted(message.content) }],
    footer: "Message delete log",
  }).catch((err) => logger.error("Message delete log failed:", err));
};
