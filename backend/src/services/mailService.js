import nodemailer from 'nodemailer';

// Email is optional. It activates only when EMAIL_USER + EMAIL_APP_PASSWORD are
// set. Without them every send is a silent no-op so the rest of the app keeps
// working. In MAIL_TEST_MODE messages are captured in `outbox` instead of sent.

let _transport = null;
let _warned = false;

const testMode = () => String(process.env.MAIL_TEST_MODE).toLowerCase() === 'true';

/** In-memory captured messages when MAIL_TEST_MODE=true (used by tests). */
export const outbox = [];
export const clearOutbox = () => { outbox.length = 0; };

const getTransport = () => {
  if (_transport !== null) return _transport;
  const user = process.env.EMAIL_USER;
  const pass = (process.env.EMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  if (!user || !pass) {
    _transport = false;
    return _transport;
  }
  _transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return _transport;
};

export const isMailConfigured = () => testMode() || getTransport() !== false;

const fromAddress = () =>
  process.env.EMAIL_FROM || `FreshCart <${process.env.EMAIL_USER || 'no-reply@freshcart.com'}>`;

/**
 * Send an email. Never throws — logs and returns `{ skipped }` / `{ error }` so
 * callers on a request path stay unaffected.
 */
export const sendMail = async ({ to, subject, html, text }) => {
  if (!to) return { skipped: true, reason: 'no recipient' };

  if (testMode()) {
    outbox.push({ to, subject, html, text, at: new Date() });
    return { ok: true, testMode: true };
  }

  const transport = getTransport();
  if (transport === false) {
    if (!_warned) {
      console.warn('[mail] disabled — set EMAIL_USER + EMAIL_APP_PASSWORD to enable');
      _warned = true;
    }
    return { skipped: true, reason: 'not configured' };
  }

  try {
    const info = await transport.sendMail({ from: fromAddress(), to, subject, html, text });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('[mail] send failed:', err.message);
    return { error: err.message };
  }
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

/**
 * Emails login credentials to a newly-created (or password-reset) delivery
 * partner. `mode` is 'created' or 'reset'.
 */
export const sendDeliveryCredentials = async ({ to, name, email, password, mode = 'created' }) => {
  if (!to) return { skipped: true, reason: 'no recipient' };
  const loginUrl = process.env.DELIVERY_APP_LOGIN_URL || '';
  const heading = mode === 'reset'
    ? 'Your FreshCart delivery password was reset'
    : 'Your FreshCart delivery partner account is ready';
  const intro = mode === 'reset'
    ? 'An administrator has reset the password for your FreshCart delivery partner account. Use the new credentials below to sign in.'
    : 'An administrator has created a FreshCart delivery partner account for you. Use the credentials below to sign in to the FreshCart Delivery app.';

  const text = [
    heading,
    '',
    intro,
    '',
    `Email:    ${email}`,
    `Password: ${password}`,
    loginUrl ? `\nSign in: ${loginUrl}` : '',
    '',
    'For your security, please change this password after your first sign-in.',
    '',
    '— FreshCart Operations',
  ].filter(Boolean).join('\n');

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
    <h2 style="color:#2E7D32;margin:0 0 12px">${escapeHtml(heading)}</h2>
    <p style="line-height:1.55;margin:0 0 16px">Hi ${escapeHtml(name || 'there')},</p>
    <p style="line-height:1.55;margin:0 0 16px">${escapeHtml(intro)}</p>
    <table style="border-collapse:collapse;background:#F8FAF7;border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin:0 0 16px">
      <tr><td style="padding:8px 14px;color:#6b7280">Email</td><td style="padding:8px 14px;font-weight:bold">${escapeHtml(email)}</td></tr>
      <tr><td style="padding:8px 14px;color:#6b7280">Password</td><td style="padding:8px 14px;font-weight:bold">${escapeHtml(password)}</td></tr>
    </table>
    ${loginUrl ? `<p style="margin:0 0 16px"><a href="${escapeHtml(loginUrl)}" style="background:#4CAF50;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">Open the Delivery app</a></p>` : ''}
    <p style="line-height:1.55;color:#6b7280;font-size:13px;margin:0 0 4px">For your security, please change this password after your first sign-in.</p>
    <p style="color:#6b7280;font-size:13px;margin:16px 0 0">— FreshCart Operations</p>
  </div>`;

  return sendMail({
    to,
    subject: mode === 'reset'
      ? 'FreshCart Delivery — your password was reset'
      : 'FreshCart Delivery — your account credentials',
    html,
    text,
  });
};
