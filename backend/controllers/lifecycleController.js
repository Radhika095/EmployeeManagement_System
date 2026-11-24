const LifecycleCase = require("../models/LifecycleCase");

const defaultChecklist = (type) => type === "onboarding"
  ? ["Collect signed offer letter", "Collect Aadhaar/PAN documents", "Verify documents", "Create email and system accounts", "Allocate laptop and other assets", "Complete induction"]
  : ["Collect resignation and confirm last working day", "Transfer knowledge and hand over work", "Return laptop and company assets", "Disable accounts/access", "Complete department exit clearance", "Prepare full and final settlement", "Issue relieving/experience letter"];

exports.list = async (req, res, next) => {
  try {
    const filter = req.query.type ? { type: req.query.type } : {};
    const rows = await LifecycleCase.find(filter).populate("employee").sort({ createdAt: -1 });
    res.json(rows);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { employee, type, effectiveDate, notes } = req.body;
    if (!employee || !["onboarding", "offboarding"].includes(type) || !effectiveDate)
      return res.status(400).json({ message: "Employee, valid lifecycle type and effective date are required." });
    const row = await LifecycleCase.create({
      employee, type, effectiveDate, notes,
      checklist: defaultChecklist(type).map(title => ({ title })),
      documents: type === "onboarding" ? [
        { name: "Aadhaar", collected: false, verified: false },
        { name: "PAN", collected: false, verified: false },
        { name: "Signed offer letter", collected: false, verified: false }
      ] : [],
      exitClearance: type === "offboarding" ? ["IT", "HR", "Finance", "Department"].map(department => ({ department })) : [],
      createdBy: req.user?._id
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const row = await LifecycleCase.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("employee");
    if (!row) return res.status(404).json({ message: "Lifecycle record not found." });
    res.json(row);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const row = await LifecycleCase.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ message: "Lifecycle record not found." });
    res.json({ message: "Lifecycle record deleted." });
  } catch (e) { next(e); }
};
