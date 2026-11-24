const express = require("express");
const { getProfile, updateProfile, downloadOwnDocument } = require("../controllers/profileController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { uploadDocuments } = require("../middleware/uploadDocuments");

const router = express.Router();
// Any signed-in employee, but only ever their own record (looked up from the token).
router.use(protect, authorize("employee"));
router.route("/").get(getProfile).put(uploadDocuments, updateProfile);
router.get("/documents/:type", downloadOwnDocument);

module.exports = router;
