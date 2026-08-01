const nodemailer = require('nodemailer')

// ── Transporter ──────────────────────────────────────────────────────────────
// Uses Gmail SMTP with an App Password (not your regular Gmail password).
// Generate one at: https://myaccount.google.com/apppasswords
// Set SMTP_USER and SMTP_PASS in backend/.env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const APP_NAME = 'DocLib'
const FROM = `"${APP_NAME}" <${process.env.SMTP_USER}>`
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// ── Helpers ───────────────────────────────────────────────────────────────────

function baseTemplate(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #0f0f14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 520px; margin: 40px auto; padding: 0 16px; }
    .card { background: #1a1a2e; border: 1px solid rgba(109,40,217,0.25); border-radius: 16px; padding: 40px 36px; }
    .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
    .logo-icon { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg,#7c3aed,#3b82f6); display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .logo-text { font-size: 1.2rem; font-weight: 800; background: linear-gradient(135deg,#a78bfa,#60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h1 { font-size: 1.35rem; font-weight: 700; color: #f1f5f9; margin: 0 0 10px; }
    p { font-size: 0.9rem; color: #94a3b8; line-height: 1.65; margin: 0 0 20px; }
    .btn { display: inline-block; padding: 13px 28px; background: linear-gradient(135deg,#7c3aed,#3b82f6); color: #fff !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 0.92rem; margin: 8px 0 24px; }
    .note { font-size: 0.78rem; color: #64748b; border-top: 1px solid rgba(255,255,255,0.07); padding-top: 20px; margin-top: 8px; }
    .url-fallback { word-break: break-all; color: #7c3aed; font-size: 0.78rem; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">
        <div class="logo-icon">⚡</div>
        <span class="logo-text">${APP_NAME}</span>
      </div>
      ${bodyHtml}
      <p class="note">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`
}

// ── Send verification email ───────────────────────────────────────────────────
async function sendVerificationEmail(email, name, token) {
  const link = `${FRONTEND_URL}?action=verify-email&token=${token}`
  const html = baseTemplate('Verify your email', `
    <h1>Verify your email, ${name} 👋</h1>
    <p>Thanks for signing up for ${APP_NAME}! Click the button below to confirm your email address and activate your account.</p>
    <a href="${link}" class="btn">Verify Email Address</a>
    <p>This link expires in <strong style="color:#f1f5f9">24 hours</strong>.</p>
    <p>If the button doesn't work, paste this URL into your browser:</p>
    <p class="url-fallback">${link}</p>
  `)

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Verify your ${APP_NAME} account`,
    html,
  })
}

// ── Send password reset email ─────────────────────────────────────────────────
async function sendPasswordResetEmail(email, name, token) {
  const link = `${FRONTEND_URL}?action=reset-password&token=${token}`
  const html = baseTemplate('Reset your password', `
    <h1>Reset your password</h1>
    <p>Hi ${name}, we received a request to reset your ${APP_NAME} password. Click below to choose a new one.</p>
    <a href="${link}" class="btn">Reset Password</a>
    <p>This link expires in <strong style="color:#f1f5f9">1 hour</strong>. If you didn't request a reset, no action is needed.</p>
    <p>If the button doesn't work, paste this URL into your browser:</p>
    <p class="url-fallback">${link}</p>
  `)

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html,
  })
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail }
