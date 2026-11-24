const mongoose = require("mongoose");

const leaveTypeSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true, trim: true, unique: true },
  name: { type: String, required: true, trim: true },
  annualQuota: { type: Number, required: true, min: 0, default: 0 },
  accrualPerMonth: { type: Number, required: true, min: 0, default: 0 },
  carryForward: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const leaveBalanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  leaveType: { type: mongoose.Schema.Types.ObjectId, ref: "LeaveType", required: true },
  year: { type: Number, required: true },
  opening: { type: Number, default: 0 },
  accrued: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  adjusted: { type: Number, default: 0 }
}, { timestamps: true });
leaveBalanceSchema.index({ employee: 1, leaveType: 1, year: 1 }, { unique: true });

const leaveRequestSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  leaveType: { type: mongoose.Schema.Types.ObjectId, ref: "LeaveType", required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  days: { type: Number, required: true, min: 0.5 },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ["Pending", "Approved", "Rejected", "Cancelled"], default: "Pending", index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewNote: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true });

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true, index: true },
  description: String
}, { timestamps: true });
holidaySchema.index({ date: 1, name: 1 }, { unique: true });

module.exports = {
  LeaveType: mongoose.model("LeaveType", leaveTypeSchema),
  LeaveBalance: mongoose.model("LeaveBalance", leaveBalanceSchema),
  LeaveRequest: mongoose.model("LeaveRequest", leaveRequestSchema),
  Holiday: mongoose.model("Holiday", holidaySchema)
};
