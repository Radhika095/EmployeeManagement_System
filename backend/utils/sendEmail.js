// Email bhejne ka helper.
// SMTP_HOST set hai to nodemailer se asli email jata hai.
// Set nahi hai (development) to email ka text backend terminal mein print hota hai,
// jisse reset link wahin se copy karke test kar sakte ho.
module.exports = async function sendEmail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST) {
    console.log(`\n[DEV] SMTP is not configured, email was not sent.\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  const nodemailer = require("nodemailer"); // sirf zarurat par load hota hai
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // 465 par true, 587 par false
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const info = await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
  console.log(`[mail] Sent to ${to}. Server response: ${info.response}`);
};
