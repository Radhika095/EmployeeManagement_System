const mongoose = require("mongoose");
const salaryStructureSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, unique: true, index: true },
  basic: { type: Number, default: 0, min: 0 },
  hra: { type: Number, default: 0, min: 0 },
  allowances: { type: Number, default: 0, min: 0 },
  otherDeductions: { type: Number, default: 0, min: 0 },
  pfRate: { type: Number, default: 0, min: 0, max: 100 },
  esiRate: { type: Number, default: 0, min: 0, max: 100 },
  professionalTax: { type: Number, default: 0, min: 0 },
  tds: { type: Number, default: 0, min: 0 },
  bankName: String, accountHolder: String, accountNumber: String, ifsc: String
}, { timestamps: true });
const payslipSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  employeeId: String, employeeName: String, department: String, designation: String,
  earnings: { basic: Number, hra: Number, allowances: Number, gross: Number },
  deductions: { pf: Number, esi: Number, professionalTax: Number, tds: Number, other: Number, total: Number },
  netPay: Number, bankName: String, accountHolder: String, accountNumber: String, ifsc: String,
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
payslipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
module.exports = {
  SalaryStructure: mongoose.model("SalaryStructure", salaryStructureSchema),
  Payslip: mongoose.model("Payslip", payslipSchema)
};
