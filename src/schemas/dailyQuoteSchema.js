const mongoose = require("mongoose");

const dailyQuoteSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  quoteCount: { type: Number, default: 0 },
  recentQuotes: { type: [String], default: [] }
});

module.exports = mongoose.model("DailyQuote", dailyQuoteSchema);
