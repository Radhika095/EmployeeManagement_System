const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.join(__dirname, "..", "private_uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const allowed = new Set(["application/pdf", "image/jpeg", "image/png"]);
module.exports = {
  uploadDir,
  uploadDocuments: multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 3 }, fileFilter: (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) return cb(new Error("Only PDF, JPG and PNG documents are allowed"));
    cb(null, true);
  } }).fields([{ name: "aadhaar", maxCount: 1 }, { name: "pan", maxCount: 1 }, { name: "offerLetter", maxCount: 1 }]),
};
