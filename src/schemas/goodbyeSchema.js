const mongoose = require("mongoose");

const goodbyeSetupSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  goodbyeMessage: {
    type: String,
    default: "Goodbye to the server!",
  },
  useEmbed: {
    type: Boolean,
    default: false,
  },
  channelId: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("goodbyeSetup", goodbyeSetupSchema);
