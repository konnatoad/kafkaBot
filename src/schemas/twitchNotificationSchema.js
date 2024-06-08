const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  twitchUsername: { type: String, required: true },
  twitchUserId: { type: String, required: true },
  customMessage: { type: String, required: true },
  notificationChannelId: { type: String, required: true },
  lastNotificationSentAt: { type: Date, default: null },
  isLivePreviously: { type: Boolean, default: false }, // New field
});

module.exports = mongoose.model("Notification", notificationSchema);
