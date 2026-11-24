const fs = require("fs");
const path = require("path");
const Employee = require("../models/Employee");
const { uploadDir } = require("../middleware/uploadDocuments");

// Fields an employee may change on their OWN record. Employee ID, work email,
// department, designation, salary, joining date and reporting manager are
// admin-only and are ignored even if sent.
const EDITABLE = ["name", "phone", "personalInfo", "contact", "emergencyContact", "employmentHistory"];
const JSON_FIELDS = ["personalInfo", "contact", "emergencyContact", "employmentHistory"];
const DOC_TYPES = ["aadhaar", "pan", "offerLetter"];

const findOwn = async (user) => {
  const employee = await Employee.findOne({ email: user.email });
  if (employee && !employee.employeeId) await employee.save(); // assigns default ID
  return employee;
};

const view = async (employee) => {
  await employee.populate("reportingManager", "name designation employeeId");
  const obj = employee.toObject();
  obj.documents = Object.fromEntries(
    DOC_TYPES.filter((k) => obj.documents?.[k]?.filename).map((k) => [
      k,
      { originalName: obj.documents[k].originalName, mimeType: obj.documents[k].mimeType },
    ])
  );
  delete obj.salary; // keep pay details on the Payroll page
  return obj;
};

// GET /api/profile
exports.getProfile = async (req, res, next) => {
  try {
    const employee = await findOwn(req.user);
    if (!employee) return res.status(404).json({ message: "No employee profile is linked to this account." });
    res.json(await view(employee));
  } catch (err) { next(err); }
};

// PUT /api/profile   (multipart/form-data, same shape as the admin form)
exports.updateProfile = async (req, res, next) => {
  try {
    const employee = await findOwn(req.user);
    if (!employee) return res.status(404).json({ message: "No employee profile is linked to this account." });

    const data = {};
    for (const key of EDITABLE) {
      if (req.body[key] === undefined) continue;
      data[key] = JSON_FIELDS.includes(key) && typeof req.body[key] === "string" ? JSON.parse(req.body[key]) : req.body[key];
    }
    Object.assign(employee, data);

    for (const key of DOC_TYPES) {
      const f = req.files?.[key]?.[0];
      if (f) employee.set(`documents.${key}`, { filename: f.filename, originalName: f.originalname, mimeType: f.mimetype, size: f.size });
    }
    await employee.save();

    // Keep the login account's display name in step with the profile.
    if (data.name && data.name.trim() !== req.user.name) {
      req.user.name = data.name.trim();
      await req.user.save({ validateBeforeSave: false });
    }
    res.json(await view(employee));
  } catch (err) { next(err); }
};

// GET /api/profile/documents/:type  (own documents only)
exports.downloadOwnDocument = async (req, res, next) => {
  try {
    const employee = await findOwn(req.user);
    const doc = DOC_TYPES.includes(req.params.type) ? employee?.documents?.[req.params.type] : null;
    if (!doc?.filename) return res.status(404).json({ message: "Document not found" });
    const filePath = path.join(uploadDir, path.basename(doc.filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Document file is missing" });
    res.download(filePath, doc.originalName || "document");
  } catch (err) { next(err); }
};
