const Employee = require("../models/Employee");
const { LeaveType, LeaveBalance, LeaveRequest, Holiday } = require("../models/Leave");

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const employeeFor = async (user) => {
  const employee = await Employee.findOne({ email: String(user.email).trim().toLowerCase() });
  if (!employee) throw fail("No employee profile is linked to your login email. Ask HR to add your work email in Employee Master.", 404);
  return employee;
};
const dayStart = (d) => new Date(new Date(d).getFullYear(), new Date(d).getMonth(), new Date(d).getDate());
const dayKey = (d) => {
  const x = dayStart(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
};

async function ensureBalances(employee, year) {
  const types = await LeaveType.find({ active: true });
  const joined = employee.joiningDate ? new Date(employee.joiningDate) : new Date(year, 0, 1);
  for (const type of types) {
    const startMonth = joined.getFullYear() < year ? 0 : joined.getFullYear() > year ? 12 : joined.getMonth();
    const now = new Date();
    const elapsedMonths = year < now.getFullYear() ? 12 : year > now.getFullYear() ? 0 : now.getMonth() + 1;
    const months = Math.max(0, elapsedMonths - startMonth);
    const accrued = Math.min(type.annualQuota, type.accrualPerMonth * months);
    await LeaveBalance.findOneAndUpdate(
      { employee: employee._id, leaveType: type._id, year },
      { $setOnInsert: { opening: 0, used: 0, adjusted: 0 }, $set: { accrued } },
      { upsert: true, new: true, runValidators: true }
    );
  }
}
async function workingDays(from, to) {
  const holidays = await Holiday.find({ date: { $gte: dayStart(from), $lte: dayStart(to) } });
  const holidaySet = new Set(holidays.map(h => dayKey(h.date)));
  let count = 0;
  for (let d = dayStart(from); d <= dayStart(to); d.setDate(d.getDate() + 1)) {
    const weekday = d.getDay();
    if (weekday !== 0 && weekday !== 6 && !holidaySet.has(dayKey(d))) count++;
  }
  return count;
}
exports.bootstrap = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    // Admin ka apna employee record nahi hota, isliye uske liye employeeFor nahi chalate
    const isAdmin = req.user.role === "admin";
    const employee = isAdmin ? null : await employeeFor(req.user);
    if (!isAdmin) await ensureBalances(employee, year);
    const [types, holidays, requests, balances] = await Promise.all([
      LeaveType.find({ active: true }).sort({ code: 1 }),
      Holiday.find({ date: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) } }).sort({ date: 1 }),
      LeaveRequest.find(isAdmin ? {} : { employee: employee._id }).populate("employee", "name employeeId").populate("leaveType", "code name").sort({ createdAt: -1 }),
      LeaveBalance.find(isAdmin ? { year } : { employee: employee._id, year }).populate("employee", "name employeeId").populate("leaveType", "code name annualQuota accrualPerMonth")
    ]);
    res.json({ employee, types, holidays, requests, balances });
  } catch (e) { next(e); }
};
exports.createRequest = async (req, res, next) => {
  try {
    const employee = await employeeFor(req.user);
    const { leaveType, fromDate, toDate, reason } = req.body;
    if (!leaveType || !fromDate || !toDate || !reason?.trim()) throw fail("Leave type, dates and reason are required.");
    const from = dayStart(fromDate), to = dayStart(toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) throw fail("Please select a valid date range.");
    const days = await workingDays(from, to);
    if (!days) throw fail("Selected date range contains no working days.");
    const type = await LeaveType.findOne({ _id: leaveType, active: true });
    if (!type) throw fail("Please select an active leave type.");
    const year = from.getFullYear();
    if (to.getFullYear() !== year) throw fail("A leave request must be within one calendar year.");
    await ensureBalances(employee, year);
    const balance = await LeaveBalance.findOne({ employee: employee._id, leaveType, year });
    const available = (balance?.opening || 0) + (balance?.accrued || 0) + (balance?.adjusted || 0) - (balance?.used || 0);
    const pending = await LeaveRequest.aggregate([{ $match: { employee: employee._id, leaveType: type._id, status: "Pending", fromDate: { $gte: new Date(year,0,1), $lt: new Date(year+1,0,1) } } }, { $group: { _id: null, days: { $sum: "$days" } } }]);
    if (days + (pending[0]?.days || 0) > available) throw fail(`Insufficient ${type.code} balance. Available: ${Math.max(0, available - (pending[0]?.days || 0))} days.`);
    const row = await LeaveRequest.create({ employee: employee._id, leaveType, fromDate: from, toDate: to, days, reason });
    res.status(201).json(await row.populate("leaveType", "code name"));
  } catch (e) { next(e); }
};
exports.reviewRequest = async (req, res, next) => {
  try {
    const { status, reviewNote = "" } = req.body;
    if (!["Approved", "Rejected"].includes(status)) throw fail("Status must be Approved or Rejected.");
    const row = await LeaveRequest.findById(req.params.id);
    if (!row) throw fail("Leave request not found.", 404);
    if (row.status !== "Pending") throw fail("Only pending requests can be reviewed.");
    if (status === "Approved") {
      const year = new Date(row.fromDate).getFullYear();
      await ensureBalances(await Employee.findById(row.employee), year);
      const balance = await LeaveBalance.findOne({ employee: row.employee, leaveType: row.leaveType, year });
      if (!balance) throw fail("Leave balance not found.");
      balance.used += row.days;
      await balance.save();
    }
    row.status = status; row.reviewedBy = req.user._id; row.reviewNote = reviewNote;
    await row.save();
    res.json(await row.populate([{ path: "employee", select: "name employeeId" }, { path: "leaveType", select: "code name" }]));
  } catch (e) { next(e); }
};
exports.createType = async (req, res, next) => {
  try {
    const { code, name, annualQuota, accrualPerMonth, carryForward } = req.body;
    if (!code || !name) throw fail("Leave code and name are required.");
    const type = await LeaveType.create({ code, name, annualQuota: Number(annualQuota), accrualPerMonth: Number(accrualPerMonth), carryForward: !!carryForward });
    res.status(201).json(type);
  } catch (e) { next(e); }
};
exports.createHoliday = async (req, res, next) => {
  try {
    if (!req.body.name || !req.body.date) throw fail("Holiday name and date are required.");
    res.status(201).json(await Holiday.create({ name: req.body.name, date: dayStart(req.body.date), description: req.body.description || "" }));
  } catch (e) { next(e); }
};
exports.updateBalance = async (req, res, next) => {
  try {
    const { employee, leaveType, year, opening, adjusted } = req.body;
    const row = await LeaveBalance.findOneAndUpdate(
      { employee, leaveType, year: Number(year) },
      { $set: { opening: Number(opening) || 0, adjusted: Number(adjusted) || 0 }, $setOnInsert: { accrued: 0, used: 0 } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(row);
  } catch (e) { next(e); }
};
