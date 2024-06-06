const { Schema, model } = require("mongoose");

const storeItemSchema = new Schema({
  guildId: {
    type: String,
    required: true,
  },
  roleId: {
    type: String,
    required: true,
    unique: true,
  },
  cost: {
    type: Number,
    required: true,
  },
});

module.exports = model("StoreItem", storeItemSchema);
