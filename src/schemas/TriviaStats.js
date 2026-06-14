const { Schema, model } = require("mongoose");

const triviaStatsSchema = new Schema({
  guildId: { type: String, required: true },
  questionId: { type: String, required: true }, // date string YYYY-MM-DD used as unique daily ID per guild
  userId: { type: String, required: true },
  wrongAttempts: { type: Number, default: 0 },
  solved: { type: Boolean, default: false },
});

triviaStatsSchema.index({ guildId: 1, questionId: 1, userId: 1 }, { unique: true });

module.exports = model("TriviaStats", triviaStatsSchema);
