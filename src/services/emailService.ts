import {
  EMAIL_DOMAIN,
  EMAIL_FROM,
  EMAIL_FROM_NAME,
  MSG91_EMAIL_API_URL,
  TEMPLATE_IDS,
  TEMPLATE_VARIABLES,
} from '../constants/loginEmailConstants.js';

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

  console.log("body is ",body);

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

export async function sendOtpEmail(
  to: Recipient,
  otp: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    templateId: TEMPLATE_IDS.OTP_LOGIN,
    variables: { [TEMPLATE_VARIABLES.OTP]: otp },
  });
}


export default { sendOtpEmail };
