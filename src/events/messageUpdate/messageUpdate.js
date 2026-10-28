const editLog = require("../../schemas/messageupdate");
const logger = require("../../extra/logger");
const { isUnloggable, postToLog, quoted } = require("../../utils/messageLogs");

module.exports = async (oldMessage, newMessage) => {
  // embeds loading in also fire messageUpdate, with the text unchanged
  if (isUnloggable(newMessage) || oldMessage.content === newMessage.content)
    return;

  const editedAt = `<t:${Math.floor(Date.now() / 1000)}:R>`;
  await postToLog(editLog, newMessage, {
    title: "Message edited!",
    description: `This message was edited ${editedAt} and is being logged for moderative purposes.`,
    fields: [
      { name: "Old message", value: quoted(oldMessage.content) },
      { name: "New message", value: quoted(newMessage.content) },
    ],
    footer: "Message update log",
  }).catch((err) => logger.error("Message update log failed:", err));
};
