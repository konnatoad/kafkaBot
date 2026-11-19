const { Schema, model } = require("mongoose");

const confessionConfigSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    // optional: where mods see who sent each confession; null keeps confessions fully anonymous
    logChannelId: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = model("ConfessionConfig", confessionConfigSchema);
