
require("dotenv").config();
const sendEmail = require("../utils/sendEmail");

const to = process.argv[2] || process.env.SMTP_USER;
if (!process.env.SMTP_HOST) {
  console.log("SMTP_HOST is not set in backend/.env, so no real email can be sent.");
  console.log("Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM, then run this again.");
  process.exit(1);
}
if (!to) {
  console.log("Give an email address:  node scripts/testEmail.js yourname@gmail.com");
  process.exit(1);
}

sendEmail({
  to,
  subject: "Headcount test email",
  text: "If you can read this, your SMTP settings are working.",
  html: "<p>If you can read this, your SMTP settings are working.</p>",
})
  .then(() => console.log(`Done. Check the inbox (and Spam folder) of ${to}`))
  .catch((err) => {
    console.error("FAILED:", err.message);
    process.exit(1);
  });