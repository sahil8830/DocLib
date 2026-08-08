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

// ── Base email template (light, clean design) ────────────────────────────────
function baseTemplate(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      background-color: #f4f6f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 560px;
      margin: 48px auto;
      padding: 0 20px 40px;
    }

    /* ── Header ── */
    .header {
      text-align: center;
      padding-bottom: 24px;
    }
    .logo-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      padding: 8px 18px 8px 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .logo-icon {
      width: 30px; height: 30px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #3b82f6);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
    }
    .logo-name {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.3px;
    }

    /* ── Card ── */
    .card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 40px 40px 32px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.05);
    }

    /* ── Icon circle at top of card ── */
    .card-icon {
      width: 52px; height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(124,58,237,0.10), rgba(59,130,246,0.10));
      border: 1px solid rgba(124,58,237,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-bottom: 20px;
    }

    h1 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 8px;
      letter-spacing: -0.4px;
    }
    .subtitle {
      font-size: 0.9rem;
      color: #6b7280;
      line-height: 1.6;
      margin: 0 0 28px;
    }

    /* ── Button ── */
    .btn-wrap { margin: 0 0 28px; }
    .btn {
      display: inline-block;
      padding: 13px 28px;
      background: linear-gradient(135deg, #7c3aed, #4f8ef7);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.9rem;
      letter-spacing: 0.1px;
      box-shadow: 0 2px 8px rgba(124,58,237,0.30);
    }

    /* ── Divider ── */
    .divider {
      border: none;
      border-top: 1px solid #f0f0f0;
      margin: 24px 0;
    }

    /* ── Meta info below button ── */
    .meta {
      font-size: 0.82rem;
      color: #9ca3af;
      line-height: 1.6;
      margin: 0 0 8px;
    }
    .meta strong { color: #6b7280; font-weight: 600; }

    /* ── Fallback URL ── */
    .fallback-label {
      font-size: 0.78rem;
      color: #9ca3af;
      margin: 16px 0 4px;
    }
    .url-fallback {
      word-break: break-all;
      font-size: 0.75rem;
      color: #7c3aed;
      text-decoration: none;
      background: #f5f3ff;
      border: 1px solid #e9d5ff;
      border-radius: 6px;
      padding: 8px 10px;
      display: block;
      line-height: 1.5;
    }

    /* ── Footer ── */
    .footer {
      text-align: center;
      padding-top: 20px;
      font-size: 0.75rem;
      color: #d1d5db;
    }
    .footer a { color: #9ca3af; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- Logo header -->
    <div class="header">
      <div class="logo-pill">
        <div class="logo-icon">⚡</div>
        <span class="logo-name">${APP_NAME}</span>
      </div>
    </div>

    <!-- Main card -->
    <div class="card">
      ${bodyHtml}
    </div>

    <!-- Footer -->
    <div class="footer">
      &copy; ${new Date().getFullYear()} ${APP_NAME} &mdash; You're receiving this because an action was requested on your account.
    </div>

  </div>
</body>
</html>`
}

// ── Send verification email ───────────────────────────────────────────────────
async function sendVerificationEmail(email, name, token) {
  const link = `${FRONTEND_URL}?action=verify-email&token=${token}`
  const html = baseTemplate('Verify your email', `
    <div class="card-icon">✉️</div>
    <h1>Verify your email</h1>
    <p class="subtitle">Hi <strong>${name}</strong>, thanks for signing up! Click the button below to confirm your email address and activate your ${APP_NAME} account.</p>

    <div class="btn-wrap">
      <a href="${link}" class="btn">Verify Email Address</a>
    </div>

    <hr class="divider" />

    <p class="meta">This link expires in <strong>24 hours</strong>.</p>
    <p class="meta">If you didn't create an account, you can safely ignore this email — nothing will happen.</p>

    <p class="fallback-label">Button not working? Copy and paste this link:</p>
    <a href="${link}" class="url-fallback">${link}</a>
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
    <div class="card-icon">🔑</div>
    <h1>Reset your password</h1>
    <p class="subtitle">Hi <strong>${name}</strong>, we received a request to reset your ${APP_NAME} password. Click below to choose a new one.</p>

    <div class="btn-wrap">
      <a href="${link}" class="btn">Reset Password</a>
    </div>

    <hr class="divider" />

    <p class="meta">This link expires in <strong>1 hour</strong>.</p>
    <p class="meta">If you didn't request a password reset, no action is needed — your password won't change.</p>

    <p class="fallback-label">Button not working? Copy and paste this link:</p>
    <a href="${link}" class="url-fallback">${link}</a>
  `)

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html,
  })
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail }
