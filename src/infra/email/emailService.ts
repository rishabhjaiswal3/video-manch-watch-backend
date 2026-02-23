import {
  EMAIL_DOMAIN,
  EMAIL_FROM,
  EMAIL_FROM_NAME,
  MSG91_EMAIL_API_URL,
  TEMPLATE_IDS,
  TEMPLATE_VARIABLES,
} from '../../shared/constants/loginEmailConstants.js';

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

interface Msg91Response {
  message?: string;
  request_id?: string;
  errors?: string;
  code?: string;
  apiError?: string;
  status?: string;
  hasError?: boolean;
}

async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const rawAuthKey = process.env.MSG91_AUTH_KEY;
  const authKey = rawAuthKey?.trim();

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
    const keyFingerprint = `${authKey.slice(0, 4)}...${authKey.slice(-2)} (len=${authKey.length})`;
    console.log('[EmailService] Sending MSG91 email', {
      url: MSG91_EMAIL_API_URL,
      templateId: options.templateId,
      recipients: recipients.map((r) => r.email),
      keyFingerprint,
    });

    const response = await fetch(MSG91_EMAIL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
      body: JSON.stringify(body),
    });

    let data: Msg91Response = {};
    try {
      data = (await response.json()) as Msg91Response;
    } catch {
      data = {};
    }

    if (!response.ok) {
      const detailedError =
        data.errors ||
        data.message ||
        `MSG91 HTTP ${response.status}`;

      console.error('[EmailService] MSG91 error:', {
        httpStatus: response.status,
        statusText: response.statusText,
        response: data,
      });

      return {
        success: false,
        error: detailedError,
      };
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
