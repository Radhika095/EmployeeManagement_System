const express = require("express");
const {
  getToday, getRoster, checkIn, checkOut, listAttendance, listShifts, createShift,
  createRegularization, listRegularizations, listPendingRegularizations, reviewRegularization,
} = require("../controllers/attendanceController");
const { protect, authorize } = require("../middleware/authMiddleware");
const router = express.Router();
router.use(protect);
router.get("/today", getToday);
router.post("/check-in", checkIn);
router.post("/check-out", checkOut);
router.get("/records", listAttendance);
router.get("/roster", authorize("admin"), getRoster); // sirf admin saare employees ki attendance dekhega
router.get("/shifts", listShifts);
router.post("/shifts", authorize("admin"), createShift);
router.post("/regularizations", createRegularization);
router.get("/regularizations", listRegularizations);
router.get("/regularizations/pending", authorize("admin"), listPendingRegularizations);
router.patch("/regularizations/:id/review", authorize("admin"), reviewRegularization);
module.exports = router;