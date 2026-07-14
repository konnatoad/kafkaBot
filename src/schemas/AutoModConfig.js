const { Schema, model } = require("mongoose");

const autoModConfigSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true },
    logChannelId: { type: String, required: true },
    autoWarn: { type: Boolean, default: false },
    ruleIds: {
      spam: String,
      keywordPreset: String,
      mentionSpam: String,
      keyword: String,
    },
  },
  { timestamps: true }
);

module.exports = model("AutoModConfig", autoModConfigSchema);
