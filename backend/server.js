
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const Shift = require("./models/Shift");
const { LeaveType } = require("./models/Leave");

const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const lifecycleRoutes = require("./routes/lifecycleRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const profileRoutes = require("./routes/profileRoutes");

const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Middleware
const allowedOrigins = new Set([
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  }
}));

app.use(express.json());

// API routes
app.get("/", (req, res) => {
  res.json({ message: "Employee Management API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/lifecycle", lifecycleRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/payroll", payrollRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Default shifts
const defaultShifts = [
  {
    name: "General Shift",
    startTime: "09:00",
    endTime: "18:00",
    breakMinutes: 60,
    active: true
  },
  {
    name: "Morning Shift",
    startTime: "06:00",
    endTime: "14:00",
    breakMinutes: 60,
    active: true
  },
  {
    name: "Evening Shift",
    startTime: "14:00",
    endTime: "22:00",
    breakMinutes: 60,
    active: true
  },
  {
    name: "Night Shift",
    startTime: "22:00",
    endTime: "06:00",
    breakMinutes: 60,
    active: true
  }
];

// Seed default data
const seedDefaultData = async () => {
  try {
    // Create or update default shifts
    for (const shift of defaultShifts) {
      await Shift.findOneAndUpdate(
        { name: shift.name },
        { $set: shift },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );
    }

    console.log("Default shifts created or updated successfully.");

    // Create default leave types if none exist
    if (await LeaveType.countDocuments() === 0) {
      await LeaveType.insertMany([
        {
          code: "CL",
          name: "Casual Leave",
          annualQuota: 12,
          accrualPerMonth: 1
        },
        {
          code: "SL",
          name: "Sick Leave",
          annualQuota: 12,
          accrualPerMonth: 1
        },
        {
          code: "PL",
          name: "Privilege Leave",
          annualQuota: 15,
          accrualPerMonth: 1.25,
          carryForward: true
        }
      ]);

      console.log("Default leave types CL, SL and PL created.");
    }

  } catch (seedError) {
    console.error("Default data setup warning:", seedError.message);
    throw seedError;
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();

    // Wait until default data is created
    await seedDefaultData();

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
