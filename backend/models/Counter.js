const mongoose = require("mongoose");

// Simple atomic counter (used to hand out employee IDs like EMP0001).
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("Counter", counterSchema);
