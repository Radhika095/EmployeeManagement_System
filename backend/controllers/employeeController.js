const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const User = require("../models/User");
const { uploadDir } = require("../middleware/uploadDocuments");
const { ensureEmployeeIds } = require("../utils/employeeId");

const fields = ["employeeId", "name", "email", "phone", "personalInfo", "contact", "emergencyContact", "employmentHistory", "department", "designation", "reportingManager", "salary", "joiningDate"];
const parse = (value) => typeof value === "string" ? JSON.parse(value) : value;
const payload = (body) => {
  const data = {};
  for (const key of fields) if (body[key] !== undefined) data[key] = ["personalInfo", "contact", "emergencyContact", "employmentHistory"].includes(key) ? parse(body[key]) : body[key];
  // Normalize optional manager reference before Mongoose casts it to ObjectId.
  if (data.reportingManager == null || ["", "null", "undefined"].includes(String(data.reportingManager).trim())) {
    data.reportingManager = null;
  } else if (!mongoose.isValidObjectId(data.reportingManager)) {
    const error = new Error("Please select a valid reporting manager or choose No manager.");
    error.status = 400;
    throw error;
  }
  // A blank Employee ID means "use the default one" - never store an empty string.
  if (data.employeeId !== undefined) { data.employeeId = String(data.employeeId || "").trim(); if (!data.employeeId) delete data.employeeId; }
  // Trim and normalize email consistently before schema validation.
  if (data.email !== undefined) data.email = String(data.email).trim().toLowerCase();
  return data;
};
const attachFiles = (data, files, old = {}) => {
  data.documents = { ...(old.documents?.toObject?.() || old.documents || {}) };
  for (const key of ["aadhaar", "pan", "offerLetter"]) if (files?.[key]?.[0]) {
    const f = files[key][0];
    data.documents[key] = { filename: f.filename, originalName: f.originalname, mimeType: f.mimetype, size: f.size };
  }
};
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.addEmployee = async (req, res, next) => {
  try {
    const data = payload(req.body); attachFiles(data, req.files);
    data.createdBy = req.user._id;
    const employee = await Employee.create(data);
    res.status(201).json(employee);
  } catch (err) { next(err); }
};
exports.getEmployees = async (req, res, next) => {
  try {
    // Backfill employee-list entries for employee accounts registered before
    // this update. Existing employee records are never overwritten.
    const accounts = await User.find({
      role: "employee",
      employeeRecordSynced: { $ne: true },
    }).select("name email _id").lean();
    if (accounts.length) {
      await Employee.bulkWrite(accounts.map((account) => ({
        updateOne: {
          filter: { email: account.email },
          update: {
            $setOnInsert: {
              name: account.name,
              email: account.email,
              phone: "Not provided",
              department: "Unassigned",
              designation: "Employee",
              salary: 0,
              joiningDate: new Date(),
              createdBy: account._id,
            },
          },
          upsert: true,
        },
      })));
      await User.updateMany(
        { _id: { $in: accounts.map((account) => account._id) } },
        { $set: { employeeRecordSynced: true } }
      );
    }

    await ensureEmployeeIds();

    const filter = {};
    if (req.query.search?.trim()) { const rx = new RegExp(escapeRegex(req.query.search.trim()), "i"); filter.$or = ["name", "email", "department", "designation", "employeeId"].map((key) => ({ [key]: rx })); }
    const list = await Employee.find(filter).sort({ createdAt: -1 }).lean();
    // Sirf ye batao ki kaun sa document uploaded hai (internal filename bahar nahi bhejte)
    res.json(list.map((emp) => ({
      ...emp,
      documents: Object.fromEntries(
        ["aadhaar", "pan", "offerLetter"]
          .filter((key) => emp.documents?.[key]?.filename)
          .map((key) => [key, { originalName: emp.documents[key].originalName, mimeType: emp.documents[key].mimeType }])
      ),
    })));
  } catch (err) { next(err); }
};
exports.getEmployee = async (req, res, next) => {
  try { const employee = await Employee.findById(req.params.id); if (!employee) return res.status(404).json({ message: "Employee not found" }); res.json(employee); }
  catch (err) { next(err); }
};
exports.updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    const data = payload(req.body); attachFiles(data, req.files, employee);
    Object.assign(employee, data); await employee.save(); res.json(employee);
  } catch (err) { next(err); }
};
exports.deleteEmployee = async (req, res, next) => {
  try { const employee = await Employee.findByIdAndDelete(req.params.id); if (!employee) return res.status(404).json({ message: "Employee not found" }); res.json({ message: "Employee deleted", id: employee._id }); }
  catch (err) { next(err); }
};
exports.downloadDocument = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    const doc = employee?.documents?.[req.params.type];
    if (!doc?.filename) return res.status(404).json({ message: "Document not found" });
    const filePath = path.join(uploadDir, path.basename(doc.filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Document file is missing" });
    res.download(filePath, doc.originalName || "document");
  } catch (err) { next(err); }
};
