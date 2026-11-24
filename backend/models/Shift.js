const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  startTime: { type: String, required: true, match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be HH:mm"] },
  endTime: { type: String, required: true, match: [/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be HH:mm"] },
  breakMinutes: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model("Shift", shiftSchema);
