const { model, Schema } = require("mongoose");

let reactor = new Schema({
  Guild: String,
  Channel: String,
  Emojis: [String],
});

module.exports = model("emojireactor", reactor);
