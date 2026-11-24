const mongoose = require("mongoose");

const regularizationSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  dateKey: { type: String, required: true },
  requestedCheckIn: { type: Date, default: null },
  requestedCheckOut: { type: Date, default: null },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending", index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewNote: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true });
module.exports = mongoose.model("Regularization", regularizationSchema);
