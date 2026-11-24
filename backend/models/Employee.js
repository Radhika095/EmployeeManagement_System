const mongoose = require("mongoose");
const { nextEmployeeId } = require("../utils/employeeId");

const documentSchema = new mongoose.Schema(
  {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    company: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    startDate: Date,
    endDate: Date,
    experience: String,
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
        "Enter a valid email address",
      ],
    },

    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
      match: [
        /^[6-9]\d{9}$/,
        "Enter a valid 10-digit Indian mobile number",
      ],
    },

    personalInfo: {
      dateOfBirth: Date,
      gender: String,
      maritalStatus: String,
    },

    contact: {
      alternatePhone: {
        type: String,
        trim: true,
        match: [
          /^[6-9]\d{9}$/,
          "Enter a valid 10-digit alternate mobile number",
        ],
      },
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },

    emergencyContact: {
      name: String,
      relationship: String,
      phone: {
        type: String,
        match: [
          /^[6-9]\d{9}$/,
          "Enter a valid 10-digit emergency contact number",
        ],
      },
    },

    documents: {
      aadhaar: documentSchema,
      pan: documentSchema,
      offerLetter: documentSchema,
    },

    employmentHistory: [historySchema],

    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },

    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
    },



    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    salary: {
      type: Number,
      required: [true, "Salary is required"],
      min: [0, "Salary cannot be negative"],
    },

    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Every employee automatically gets a default employee ID (EMP0001, ...).
employeeSchema.pre("validate", async function (next) {
  try {
    if (!this.employeeId) this.employeeId = await nextEmployeeId();
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Employee", employeeSchema);