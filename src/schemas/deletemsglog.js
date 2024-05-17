const { Schema, model } = require("mongoose");

let deletemsglog = new Schema({
  Guild: String,
  Channel: String,
});

module.exports = model("deletemsglog234", deletemsglog);
