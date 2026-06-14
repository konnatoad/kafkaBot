const { Schema, model } = require("mongoose");

const triviaConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  time: { type: String, required: true }, // HH:MM in guild's timezone
  timezone: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard", "random"],
    default: "random",
  },
  categoryIds: { type: [String], default: [] },
  categoryNames: { type: [String], default: [] },
  enabled: { type: Boolean, default: true },
  lastSentDate: { type: String, default: null }, // YYYY-MM-DD in guild's timezone
  lastMessageId: { type: String, default: null },
  correctAnswer: { type: String, default: null },
  questionDifficulty: { type: String, default: null },
});

module.exports = model("TriviaConfig", triviaConfigSchema);
