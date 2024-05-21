const { model, Schema } = require("mongoose");

let warningSchema = new Schema({
  GuildID: String,
  UserID: String,
  UserNAME: String,
  Content: Array,
});

module.exports = model("Warnings", warningSchema);
