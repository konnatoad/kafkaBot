const { Schema, model } = require("mongoose");

const cooldownSchema = new Schema({
  commandName: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  endsAt: {
    type: Date,
    required: true,
  },
});

cooldownSchema.index({ userId: 1, commandName: 1 }, { unique: true });
cooldownSchema.index({ endsAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model("Cooldown", cooldownSchema);
