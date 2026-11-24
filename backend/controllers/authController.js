const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Employee = require("../models/Employee");
const sendEmail = require("../utils/sendEmail");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const userPayload = (user) => ({
  token: signToken(user._id),
  user: { id: user._id, name: user.name, email: user.email, role: user.role },
});

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role = "employee", adminCode, phone } = req.body;
    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email and password are required");
    }
    if (!["admin", "employee"].includes(role)) {
      res.status(400);
      throw new Error("Role must be admin or employee");
    }
    // Employees must give a phone number (it goes into their employee record)
    if (role === "employee" && !String(phone || "").trim()) {
      res.status(400);
      throw new Error("Phone number is required");
    }
    // Admin accounts are protected by a secret code from backend/.env so that
    // nobody can make themselves an admin just by choosing it on the form.
    if (role === "admin") {
      const expected = process.env.ADMIN_SIGNUP_CODE;
      if (!expected) {
        res.status(403);
        throw new Error("Admin registration is disabled. Set ADMIN_SIGNUP_CODE in backend/.env.");
      }
      if (adminCode !== expected) {
        res.status(403);
        throw new Error("Invalid admin access code");
      }
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      res.status(409);
      throw new Error("An account with this email already exists");
    }
    const user = await User.create({ name, email, password, role });

    // Admin accounts are not employees, so they get no employee record.
    if (role === "admin") {
      return res.status(201).json(userPayload(user));
    }

    // Every newly registered employee account also gets an employee-list record.
    // Registration collects only basic account details, so the remaining
    // required employee fields receive editable starter values.
    try {
      const existingEmployee = await Employee.findOne({ email: email.toLowerCase() });
      if (!existingEmployee) {
        await Employee.create({
          name: user.name,
          email: user.email,
          phone: String(phone).trim(),
          department: "Unassigned",
          designation: "Employee",
          salary: 0,
          joiningDate: new Date(),
          createdBy: user._id,
        });
      }
      user.employeeRecordSynced = true;
      await user.save();
    } catch (employeeError) {
      // Avoid leaving an account that cannot appear in the employee list.
      await User.deleteOne({ _id: user._id });
      throw employeeError;
    }

    res.status(201).json(userPayload(user));
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password are required");
    }
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error("Incorrect email or password");
    }
    // "Login as Admin / Employee": the selected role must match the account.
    if (role && role !== user.role) {
      res.status(403);
      throw new Error(`This account is not registered as ${role === "admin" ? "an admin" : "an employee"}. Choose the correct login type.`);
    }
    res.json(userPayload(user));
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  const { _id, name, email, role } = req.user;
  res.json({ user: { id: _id, name, email, role } });
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// POST /api/auth/forgot-password   body: { email }
// Hamesha ek hi jawab dete hain, taaki koi email check na kar sake ki registered hai ya nahi.
// Sirf testing ke liye: .env mein MAIL_DEBUG=true ho to jawab mein asli wajah ("debug") bhi aati hai.
exports.forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }
    const generic = { message: "If this email is registered, a password reset link has been sent. It expires in 15 minutes." };
    const reply = (reason) => res.json(process.env.MAIL_DEBUG === "true" ? { ...generic, debug: reason } : generic);

    let user = await User.findOne({ email });
    if (!user) {
      // Admin ne employee add kiya hai par usne kabhi register nahi kiya: uska login yahin bana dete hain.
      // Password random hota hai (kisi ko pata nahi), asli password wo reset link se set karega.
      const employee = await Employee.findOne({ email }).select("name email").lean();
      if (!employee) {
        console.log(`[forgot-password] No login account and no employee record found for "${email}".`);
        return reply("No login account and no employee record exists for this email. Check the spelling.");
      }
      console.log(`[forgot-password] "${email}" is an employee without a login. Creating the login account...`);
      user = await User.create({
        name: employee.name,
        email: employee.email,
        password: crypto.randomBytes(24).toString("hex"),
        role: "employee",
        employeeRecordSynced: true,
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = hashToken(token);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    console.log(`[forgot-password] Account found for ${email}. Sending reset email...`);
    const link = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password/${token}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Password reset - Headcount",
        text: `Hi ${user.name},\n\nUse the link below to reset your password (valid for 15 minutes):\n${link}\n\nIf you did not request this, you can ignore this email.`,
        html: `<p>Hi ${user.name},</p><p>Click the button below to reset your password (valid for 15 minutes).</p><p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Reset password</a></p><p>Or open this link in your browser:<br>${link}</p><p>If you did not request this, you can ignore this email.</p>`,
      });
    } catch (mailError) {
      // Email nahi gayi: token hata do aur error backend console mein dikhao
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("Error sending reset email:", mailError.message);
      return reply(`Sending the email FAILED: ${mailError.message}`);
    }

    if (!process.env.SMTP_HOST) {
      return reply("SMTP_HOST is not set (or the backend was not restarted after editing backend/.env), so NO email was sent. The reset link was printed in the backend terminal.");
    }
    console.log(`[forgot-password] Email accepted by the mail server for ${user.email}. Check the inbox and Spam folder.`);
    reply(`The mail server accepted the email for ${user.email}. Check the inbox and the Spam folder.`);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password/:token   body: { password }
exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }
    const user = await User.findOne({
      resetPasswordToken: hashToken(req.params.token),
      resetPasswordExpires: { $gt: new Date() },
    }).select("+password");
    if (!user) {
      res.status(400);
      throw new Error("This reset link is invalid or has expired. Please request a new one.");
    }
    user.password = password; // pre-save hook ise hash kar deta hai
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: "Password changed. You can now sign in with your new password." });
  } catch (err) {
    next(err);
  }
};
