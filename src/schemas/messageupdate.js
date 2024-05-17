const { Schema, model } = require("mongoose");

let messageupdate = new Schema({
  Guild: String,
  Channel: String,
});

module.exports = model("messageUpdate", messageupdate);
