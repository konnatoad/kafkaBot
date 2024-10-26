const { Schema, model } = require("mongoose");

const userProfileSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    Guild: {
      type: String,
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    lastDailyCollected: {
      type: String,
    },
    dailyStreak: {
      type: Number,
      default: 0, // New field to track the streak of consecutive daily collections
    },
    reminderTime: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = model("UserProfile", userProfileSchema);
