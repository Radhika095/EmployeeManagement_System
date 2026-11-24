const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: Date,
  notes: String
}, { _id: true });

const assetSchema = new mongoose.Schema({
  assetType: { type: String, required: true },
  assetTag: String,
  serialNumber: String,
  allocatedAt: Date,
  returnedAt: Date,
  condition: String,
  status: { type: String, enum: ["allocated", "returned", "lost", "damaged"], default: "allocated" }
}, { _id: true });

const LifecycleCaseSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  type: { type: String, enum: ["onboarding", "offboarding"], required: true },
  status: { type: String, enum: ["in_progress", "completed", "cancelled"], default: "in_progress" },
  effectiveDate: { type: Date, required: true },
  checklist: [checklistItemSchema],
  documents: [{ name: String, fileName: String, collected: { type: Boolean, default: false }, verified: { type: Boolean, default: false }, notes: String }],
  assets: [assetSchema],
  exitClearance: [{ department: String, owner: String, cleared: { type: Boolean, default: false }, clearedAt: Date, remarks: String }],
  settlement: {
    currency: { type: String, default: "INR" },
    salaryDue: { type: Number, default: 0 },
    leaveEncashment: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    gratuity: { type: Number, default: 0 },
    notes: String,
    status: { type: String, enum: ["not_started", "calculated", "approved", "paid"], default: "not_started" },
    paidAt: Date
  },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.model("LifecycleCase", LifecycleCaseSchema);
