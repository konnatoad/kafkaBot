const { Schema, model } = require("mongoose");

const permissionAlertSchema = new Schema({
  guildId: { type: String, required: true },
  key: { type: String, required: true },
  lastSentAt: { type: Date, required: true },
  lastResult: { type: String, default: null },
  lastDetail: { type: String, default: null },
});

permissionAlertSchema.index({ guildId: 1, key: 1 }, { unique: true });
module.exports = model("PermissionAlert", permissionAlertSchema);
