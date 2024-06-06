const mongoose = require("mongoose");

const banSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  expirationTime: { type: Date, required: true },
  guildId: { type: String, required: true },
});

const Ban = mongoose.model("Ban", banSchema);

module.exports = Ban;
