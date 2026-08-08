const nodemailer = require('nodemailer')

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
const YEAR = new Date().getFullYear()

// ── Base template (table-based for maximum email client compatibility) ─────────
function baseTemplate(title, { icon, heading, body, btnText, btnHref, expiry }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${title}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }
    body { margin: 0; padding: 0; background-color: #f0f2f5; }
    a { color: #7c3aed; }
    @media only screen and (max-width: 600px) {
      .email-card { width: 100% !important; }
      .email-pad  { padding: 28px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;">

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background-color:#f0f2f5;">
  <tr>
    <td align="center" style="padding:40px 16px 32px;">

      <!-- ── Logo row ── -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"
              style="border-radius:999px;background:#ffffff;border:1px solid #e2e8f0;">
              <tr>
                <td style="padding:8px 18px 8px 10px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:middle;">
                        <div style="width:30px;height:30px;border-radius:50%;
                          background:linear-gradient(135deg,#7c3aed,#3b82f6);
                          font-size:15px;text-align:center;line-height:30px;">⚡</div>
                      </td>
                      <td style="vertical-align:middle;padding-left:8px;">
                        <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                          font-size:15px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">${APP_NAME}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- ── Email card ── -->
      <table role="presentation" class="email-card" cellpadding="0" cellspacing="0" border="0"
        width="520" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;
        box-shadow:0 2px 16px rgba(0,0,0,0.06);">
        <tr>
          <td class="email-pad" style="padding:40px 40px 32px;">

            <!-- Icon badge -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td style="background:#f5f3ff;border:1px solid #ede9fe;border-radius:12px;
                  width:48px;height:48px;text-align:center;font-size:22px;line-height:48px;">
                  ${icon}
                </td>
              </tr>
            </table>

            <!-- Heading -->
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              font-size:20px;font-weight:700;color:#0f172a;margin:0 0 8px;letter-spacing:-0.4px;">
              ${heading}
            </p>

            <!-- Body text -->
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              font-size:14px;color:#64748b;line-height:1.65;margin:0 0 28px;">
              ${body}
            </p>

            <!-- CTA Button -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
              <tr>
                <td style="border-radius:10px;
                  background:linear-gradient(135deg,#7c3aed,#4f8ef7);
                  box-shadow:0 3px 10px rgba(124,58,237,0.35);">
                  <a href="${btnHref}"
                    style="display:inline-block;padding:13px 30px;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                    font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;
                    border-radius:10px;letter-spacing:0.1px;">
                    ${btnText}
                  </a>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
              <tr>
                <td style="border-top:1px solid #f1f5f9;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>

            <!-- Expiry note -->
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              font-size:12px;color:#94a3b8;margin:0 0 6px;">
              ⏱ This link expires in <strong style="color:#64748b;">${expiry}</strong>.
            </p>
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              font-size:12px;color:#94a3b8;margin:0 0 20px;">
              🔒 If you didn't request this, you can safely ignore this email.
            </p>

            <!-- Fallback URL box -->
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              font-size:11px;color:#94a3b8;margin:0 0 6px;">
              Button not working? Copy and paste this link:
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:10px 12px;">
                  <a href="${btnHref}"
                    style="font-family:monospace;font-size:11px;color:#7c3aed;
                    text-decoration:none;word-break:break-all;line-height:1.5;">
                    ${btnHref}
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>

      <!-- ── Footer ── -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
        <tr>
          <td align="center"
            style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
            font-size:11px;color:#cbd5e1;line-height:1.6;">
            &copy; ${YEAR} ${APP_NAME} &mdash; AI-powered document Q&amp;A
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>

</body>
</html>`
}

// ── Send verification email ───────────────────────────────────────────────────
async function sendVerificationEmail(email, name, token) {
  const link = `${FRONTEND_URL}?action=verify-email&token=${token}`
  const html = baseTemplate('Verify your email', {
    icon: '✉️',
    heading: `Verify your email, ${name}!`,
    body: `Thanks for signing up for <strong style="color:#0f172a;">${APP_NAME}</strong>. Click the button below to confirm your email address and activate your account.`,
    btnText: 'Verify Email Address',
    btnHref: link,
    expiry: '24 hours',
  })

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
  const html = baseTemplate('Reset your password', {
    icon: '🔑',
    heading: 'Reset your password',
    body: `Hi <strong style="color:#0f172a;">${name}</strong>, we received a request to reset your ${APP_NAME} password. Click the button below to choose a new one.`,
    btnText: 'Reset Password',
    btnHref: link,
    expiry: '1 hour',
  })

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html,
  })
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail }
