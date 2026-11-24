const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD in server-local time
  shift: { type: mongoose.Schema.Types.ObjectId, ref: "Shift", default: null },
  checkIn: { type: Date, default: null },
  checkOut: { type: Date, default: null },
  checkInLocation: { latitude: Number, longitude: Number, accuracy: Number },
  checkOutLocation: { latitude: Number, longitude: Number, accuracy: Number },
  overtimeMinutes: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["Present", "Incomplete", "Regularized"], default: "Incomplete" },
}, { timestamps: true });

attendanceSchema.index({ employee: 1, dateKey: 1 }, { unique: true });
module.exports = mongoose.model("Attendance", attendanceSchema);
