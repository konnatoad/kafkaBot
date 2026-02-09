const { Schema, model } = require("mongoose");

const confessionConfigSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = model("ConfessionConfig", confessionConfigSchema);
