const mongoose = require("mongoose");
const Counter = require("../models/Counter");

const PREFIX = "EMP";
const format = (n) => `${PREFIX}${String(n).padStart(4, "0")}`;

// Next free employee ID (EMP0001, EMP0002, ...). The counter is seeded from the
// highest existing EMP#### so IDs already in the database are never reused.
async function nextEmployeeId() {
  const Employee = mongoose.model("Employee");
  if (!(await Counter.exists({ _id: "employeeId" }))) {
    const existing = await Employee.find({ employeeId: new RegExp(`^${PREFIX}\\d+$`) })
      .select("employeeId")
      .lean();
    const max = existing.reduce((m, e) => Math.max(m, parseInt(e.employeeId.slice(PREFIX.length), 10) || 0), 0);
    try {
      await Counter.create({ _id: "employeeId", seq: max });
    } catch (err) {
      if (err.code !== 11000) throw err; // another request seeded it first
    }
  }
  for (;;) {
    const { seq } = await Counter.findByIdAndUpdate("employeeId", { $inc: { seq: 1 } }, { new: true });
    const id = format(seq);
    // Skip IDs an admin typed in by hand.
    if (!(await Employee.exists({ employeeId: id }))) return id;
  }
}

// Give an ID to every employee record that doesn't have one yet (older records).
async function ensureEmployeeIds() {
  const Employee = mongoose.model("Employee");
  const missing = await Employee.find({ $or: [{ employeeId: { $exists: false } }, { employeeId: null }, { employeeId: "" }] })
    .sort({ createdAt: 1 })
    .select("_id");
  for (const { _id } of missing) {
    await Employee.updateOne({ _id }, { $set: { employeeId: await nextEmployeeId() } });
  }
}

module.exports = { nextEmployeeId, ensureEmployeeIds };
