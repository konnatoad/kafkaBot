const mongoose = require("mongoose");

const quoteSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  authorId: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  addedBy: {
    type: String,
    required: true,
  },
});

const Quote = mongoose.model("Quote", quoteSchema);

module.exports = Quote;
