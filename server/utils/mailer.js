// Outgoing email over SMTP (nodemailer). Configure in .env:
//   SMTP_HOST, SMTP_PORT (465 = SSL, else STARTTLS), SMTP_USER, SMTP_PASS,
//   MAIL_FROM (defaults to SMTP_USER), ADMIN_EMAIL (comma-separated recipients of alerts)
// Without SMTP_HOST nothing is sent; the message is logged instead so dev setups keep working.
const nodemailer = require('nodemailer');

let transport = null;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transport;
}

// Sends { subject, text, html } to the admin. Returns true if handed to the SMTP server.
async function sendToAdmin({ subject, text, html }) {
  const to = process.env.ADMIN_EMAIL;
  const t = getTransport();
  if (!t || !to) {
    console.warn(`[mail] not sent (set SMTP_HOST and ADMIN_EMAIL to enable): ${subject}\n${text}`);
    return false;
  }
  await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
  return true;
}

module.exports = { sendToAdmin };
