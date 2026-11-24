const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const Shift = require("../models/Shift");
const Regularization = require("../models/Regularization");

const todayKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const getEmployeeForUser = async (user) => {
  const employee = await Employee.findOne({ email: String(user.email).toLowerCase() });
  if (!employee) throw Object.assign(new Error("No employee profile is linked to your login email. Ask HR to add an employee with the same work email."), { status: 404 });
  return employee;
};
const validateLocation = (location) => {
  if (!location || !Number.isFinite(Number(location.latitude)) || !Number.isFinite(Number(location.longitude))) {
    throw badRequest("Location permission is required. Allow location access and try again.");
  }
  const lat = Number(location.latitude), lon = Number(location.longitude);
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) throw badRequest("Invalid location coordinates.");
  const officeLat = Number(process.env.OFFICE_LATITUDE);
  const officeLon = Number(process.env.OFFICE_LONGITUDE);
  const radius = Number(process.env.GEOFENCE_RADIUS_METERS || 200);
  if (process.env.OFFICE_LATITUDE && process.env.OFFICE_LONGITUDE) {
    const toRad = (n) => n * Math.PI / 180;
    const dLat = toRad(lat - officeLat), dLon = toRad(lon - officeLon);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(officeLat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
    const meters = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (meters > radius) throw badRequest(`You are outside the office geo-fence (${Math.round(meters)}m away; allowed ${radius}m).`);
  }
  return { latitude: lat, longitude: lon, accuracy: Number(location.accuracy) || undefined };
};
const getDefaultShift = async () => {
  let shift = await Shift.findOne({
    name: "General Shift",
    active: true
  });

  if (!shift) {
    shift = await Shift.create({
      name: "General Shift",
      startTime: "09:00",
      endTime: "18:00",
      breakMinutes: 60,
      active: true
    });
  }

  return shift;
};
const calculateOvertime = (checkIn, checkOut, shift) => {
  if (!checkOut || !shift) return 0;
  const [hours, minutes] = shift.endTime.split(":").map(Number);
  const shiftEnd = new Date(checkIn);
  shiftEnd.setHours(hours, minutes, 0, 0);
  if (shiftEnd <= checkIn) shiftEnd.setDate(shiftEnd.getDate() + 1);
  return Math.max(0, Math.floor((checkOut - shiftEnd) / 60000));
};

exports.getToday = async (req, res, next) => {
  try {
    // Admin ka personal attendance nahi hota (admin employee nahi hai)
    if (req.user.role === "admin") return res.json({ employee: null, attendance: null });
    const employee = await getEmployeeForUser(req.user);
    const record = await Attendance.findOne({ employee: employee._id, dateKey: todayKey() }).populate("shift", "name startTime endTime");
    res.json({ employee: { _id: employee._id, employeeId: employee.employeeId, name: employee.name }, attendance: record });
  } catch (err) { next(err); }
};

exports.checkIn = async (req, res, next) => {
  try {
    const employee = await getEmployeeForUser(req.user);
    const location = validateLocation(req.body.location);
    const dateKey = todayKey();
    const existing = await Attendance.findOne({ employee: employee._id, dateKey });
    if (existing?.checkIn) throw badRequest("You have already checked in today.");
    const shift = req.body.shiftId && mongoose.isValidObjectId(req.body.shiftId)
      ? await Shift.findOne({ _id: req.body.shiftId, active: true }) : await getDefaultShift();
    if (!shift) throw badRequest("Selected shift was not found or is inactive.");
    const record = existing || new Attendance({ employee: employee._id, dateKey });
    record.shift = shift._id;
    record.checkIn = new Date();
    record.checkInLocation = location;
    record.status = "Incomplete";
    await record.save();
    await record.populate("shift", "name startTime endTime");
    res.status(201).json(record);
  } catch (err) { next(err); }
};

exports.checkOut = async (req, res, next) => {
  try {
    const employee = await getEmployeeForUser(req.user);
    const location = validateLocation(req.body.location);
    const record = await Attendance.findOne({ employee: employee._id, dateKey: todayKey() }).populate("shift");
    if (!record?.checkIn) throw badRequest("You must check in before checking out.");
    if (record.checkOut) throw badRequest("You have already checked out today.");
    record.checkOut = new Date();
    record.checkOutLocation = location;
    record.overtimeMinutes = calculateOvertime(record.checkIn, record.checkOut, record.shift);
    record.status = "Present";
    await record.save();
    res.json(record);
  } catch (err) { next(err); }
};

exports.listAttendance = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role !== "admin") {
      const employee = await getEmployeeForUser(req.user);
      filter.employee = employee._id;
    }
    if (req.query.date) filter.dateKey = req.query.date;
    if (req.query.employeeId && mongoose.isValidObjectId(req.query.employeeId)) filter.employee = req.query.employeeId;
    const records = await Attendance.find(filter).populate("employee", "employeeId name department designation").populate("shift", "name startTime endTime").sort({ dateKey: -1, checkIn: -1 }).limit(500);
    res.json(records);
  } catch (err) { next(err); }
};

exports.listShifts = async (req, res, next) => {
  try {
    let shifts = await Shift.find({ active: true }).sort({ startTime: 1 });
    if (!shifts.length) shifts = [await getDefaultShift()];
    res.json(shifts);
  } catch (err) { next(err); }
};
exports.createShift = async (req, res, next) => {
  try {
    const { name, startTime, endTime, breakMinutes = 0 } = req.body;
    if (!name?.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || "") || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime || "")) throw badRequest("Enter a shift name and valid start/end times (HH:mm).");
    const shift = await Shift.create({ name: name.trim(), startTime, endTime, breakMinutes: Number(breakMinutes) || 0 });
    res.status(201).json(shift);
  } catch (err) { next(err); }
};

exports.createRegularization = async (req, res, next) => {
  try {
    const employee = await getEmployeeForUser(req.user);
    const { dateKey, requestedCheckIn, requestedCheckOut, reason } = req.body;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || "") || !reason?.trim()) throw badRequest("Date and reason are required.");
    if (!requestedCheckIn && !requestedCheckOut) throw badRequest("Enter the corrected check-in time, check-out time, or both.");
    const request = await Regularization.create({ employee: employee._id, dateKey, requestedCheckIn: requestedCheckIn || null, requestedCheckOut: requestedCheckOut || null, reason: reason.trim() });
    res.status(201).json(request);
  } catch (err) { next(err); }
};
exports.listPendingRegularizations = async (req, res, next) => {
  try {
    const records = await Regularization.find({ status: "Pending" })
      .populate("employee", "employeeId name department designation")
      .sort({ createdAt: 1 }).limit(200);
    res.json(records);
  } catch (err) { next(err); }
};

exports.listRegularizations = async (req, res, next) => {
  try {
    if (req.user.role === "admin") return res.json([]);
    const employee = await getEmployeeForUser(req.user);
    const records = await Regularization.find({ employee: employee._id }).sort({ createdAt: -1 }).limit(100);
    res.json(records);
  } catch (err) { next(err); }
};
exports.reviewRegularization = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw badRequest("Invalid regularization request ID.");
    const { status, reviewNote = "" } = req.body;
    if (!["Approved", "Rejected"].includes(status)) throw badRequest("Status must be Approved or Rejected.");
    const request = await Regularization.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Regularization request not found." });
    if (request.status !== "Pending") throw badRequest("This request has already been reviewed.");
    request.status = status; request.reviewedBy = req.user._id; request.reviewNote = reviewNote;
    if (status === "Approved") {
      let attendance = await Attendance.findOne({ employee: request.employee, dateKey: request.dateKey });
      if (!attendance) attendance = new Attendance({ employee: request.employee, dateKey: request.dateKey, status: "Regularized" });
      if (request.requestedCheckIn) attendance.checkIn = request.requestedCheckIn;
      if (request.requestedCheckOut) attendance.checkOut = request.requestedCheckOut;
      attendance.status = "Regularized";
      if (attendance.checkIn && attendance.checkOut && attendance.shift) {
        await attendance.populate("shift");
        attendance.overtimeMinutes = calculateOvertime(attendance.checkIn, attendance.checkOut, attendance.shift);
      }
      await attendance.save();
    }
    await request.save();
    res.json(request);
  } catch (err) { next(err); }
};

// GET /api/attendance/roster?date=YYYY-MM-DD
// Returns ALL employees with their attendance for the date (default: today).
exports.getRoster = async (req, res, next) => {
  try {
    const date = req.query.date || todayKey();
    const [employees, records] = await Promise.all([
      Employee.find().select("employeeId name email department designation").sort({ name: 1 }).lean(),
      Attendance.find({ dateKey: date }).populate("shift", "name").lean(),
    ]);
    const byEmployee = new Map(records.map((r) => [String(r.employee), r]));
    res.json({
      date,
      rows: employees.map((emp) => {
        const rec = byEmployee.get(String(emp._id));
        return {
          employee: emp,
          shift: rec?.shift || null,
          checkIn: rec?.checkIn || null,
          checkOut: rec?.checkOut || null,
          overtimeMinutes: rec?.overtimeMinutes || 0,
          status: rec?.status || "Absent",
        };
      }),
    });
  } catch (err) { next(err); }
};
