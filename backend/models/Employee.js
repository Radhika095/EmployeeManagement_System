const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
      match: [/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number"],
    },
    department: { type: String, required: [true, "Department is required"], trim: true },
    designation: { type: String, required: [true, "Designation is required"], trim: true },
    salary: { type: Number, required: [true, "Salary is required"], min: [0, "Salary cannot be negative"] },
    joiningDate: { type: Date, required: [true, "Joining date is required"] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", employeeSchema);
