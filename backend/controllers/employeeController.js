const Employee = require("../models/Employee");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// POST /api/employees
exports.addEmployee = async (req, res, next) => {
  try {
    const { name, email, phone, department, designation, salary, joiningDate } = req.body;
    const employee = await Employee.create({
      name, email, phone, department, designation, salary, joiningDate,
      createdBy: req.user._id,
    });
    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
};

// GET /api/employees?search=
exports.getEmployees = async (req, res, next) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [{ name: rx }, { email: rx }, { department: rx }, { designation: rx }];
    }
    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id
exports.getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }
    res.json(employee);
  } catch (err) {
    next(err);
  }
};

// PUT /api/employees/:id
exports.updateEmployee = async (req, res, next) => {
  try {
    const { name, email, phone, department, designation, salary, joiningDate } = req.body;
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, department, designation, salary, joiningDate },
      { new: true, runValidators: true }
    );
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }
    res.json(employee);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/employees/:id
exports.deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }
    res.json({ message: "Employee deleted", id: employee._id });
  } catch (err) {
    next(err);
  }
};
