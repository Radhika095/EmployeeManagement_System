const express = require("express");
const { addEmployee, getEmployees, getEmployee, updateEmployee, deleteEmployee, downloadDocument } = require("../controllers/employeeController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { uploadDocuments } = require("../middleware/uploadDocuments");
const router = express.Router();
router.use(protect, authorize("admin")); // sirf admin employees manage karega
router.route("/").get(getEmployees).post(uploadDocuments, addEmployee);
router.get("/:id/documents/:type", downloadDocument);
router.route("/:id").get(getEmployee).put(uploadDocuments, updateEmployee).delete(deleteEmployee);
module.exports = router;