const { Schema, model } = require("mongoose");

// a server's changes to the default blocked words: its own extra words and the defaults it turned off
const blockedWordsSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true },
    added: { type: [String], default: [] },
    removed: { type: [String], default: [] },
  },
  { timestamps: true },
);

module.exports = model("BlockedWords", blockedWordsSchema);
