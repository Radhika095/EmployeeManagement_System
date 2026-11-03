const express = require("express");
const {
  addEmployee, getEmployees, getEmployee, updateEmployee, deleteEmployee,
} = require("../controllers/employeeController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").get(getEmployees).post(addEmployee);
router.route("/:id").get(getEmployee).put(updateEmployee).delete(deleteEmployee);

module.exports = router;
