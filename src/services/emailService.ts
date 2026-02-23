/**
 * Email Service — MSG91
 *
 * Sends transactional emails (OTP, welcome, password reset) via MSG91's
 * Email API: https://control.msg91.com/api/v5/email/send
 *
 * Required env var:
 *   MSG91_AUTH_KEY=<your key from MSG91 dashboard>
 */

// ─── Constants (mirrored from constants/loginEmailConstants.js) ───────────────

const MSG91_EMAIL_API_URL = 'https://control.msg91.com/api/v5/email/send';

const EMAIL_FROM = 'support@videomanch.com';
const EMAIL_FROM_NAME = 'VideoManch';
const EMAIL_DOMAIN = 'videomanch.com';

const TEMPLATE_IDS = {
  OTP_LOGIN: 'videomanch_template_1',
  WELCOME: 'videomanch_welcome_1',
  PASSWORD_RESET: 'videomanch_password_reset_1',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recipient {
  email: string;
  name?: string;
}

interface SendEmailOptions {
  to: Recipient | Recipient[];
  templateId: string;
  variables?: Record<string, string>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Core send function ───────────────────────────────────────────────────────

/**
 * Low-level send — builds the MSG91 payload and fires the request.
 */
async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const authKey = process.env.MSG91_AUTH_KEY;

  if (!authKey) {
    console.error('[EmailService] MSG91_AUTH_KEY is not set');
    return { success: false, error: 'Email service not configured' };
  }

  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  const body = {
    recipients: recipients.map((r) => ({
      to: [{ email: r.email, name: r.name ?? r.email }],
      variables: options.variables ?? {},
    })),
    from: {
      email: EMAIL_FROM,
      name: EMAIL_FROM_NAME,
    },
    domain: EMAIL_DOMAIN,
    template_id: options.templateId,
  };

  try {
    const response = await fetch(MSG91_EMAIL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as { message?: string; request_id?: string };

    if (!response.ok) {
      console.error('[EmailService] MSG91 error:', data);
      return { success: false, error: data.message ?? 'Unknown error from MSG91' };
    }

    console.log(`[EmailService] ✅ Email sent to ${recipients.map((r) => r.email).join(', ')}`);
    return { success: true, messageId: data.request_id };
  } catch (err: any) {
    console.error('[EmailService] Network error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── High-level helpers ───────────────────────────────────────────────────────

/**
 * Send an OTP email for login / signup verification.
 *
 * @example
 * await sendOtpEmail({ email: 'user@example.com', name: 'Rishabh' }, '6534');
 */
export async function sendOtpEmail(
  to: Recipient,
  otp: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    templateId: TEMPLATE_IDS.OTP_LOGIN,
    variables: { OTP: otp },
  });
}

/**
 * Send a welcome email after successful registration.
 *
 * @example
 * await sendWelcomeEmail({ email: 'user@example.com', name: 'Rishabh' });
 */
export async function sendWelcomeEmail(to: Recipient): Promise<EmailResult> {
  return sendEmail({
    to,
    templateId: TEMPLATE_IDS.WELCOME,
    variables: { USERNAME: to.name ?? to.email },
  });
}

/**
 * Send a password-reset link email.
 *
 * @example
 * await sendPasswordResetEmail(
 *   { email: 'user@example.com', name: 'Rishabh' },
 *   'https://videomanch.com/reset?token=abc'
 * );
 */
export async function sendPasswordResetEmail(
  to: Recipient,
  resetLink: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    templateId: TEMPLATE_IDS.PASSWORD_RESET,
    variables: { USERNAME: to.name ?? to.email, RESET_LINK: resetLink },
  });
}

export default { sendOtpEmail, sendWelcomeEmail, sendPasswordResetEmail };
