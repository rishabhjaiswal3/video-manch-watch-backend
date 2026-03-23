const sendOtpEmail = async ({
  email,
  otp,
  logLabel,
  templateIdEnvKey,
}) => {
  if (process.env.NODE_ENV !== 'production' || process.env.AUTH_DEBUG_OTP === 'true') {
    console.log(`[AUTH] ${logLabel} for ${email}: ${otp}`);
  }

  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const templateId =
    process.env[templateIdEnvKey]?.trim() ||
    process.env.MSG91_SIGNUP_TEMPLATE_ID?.trim();
  const domain = process.env.MSG91_DOMAIN?.trim();
  const fromEmail = process.env.MSG91_FROM_EMAIL?.trim() || 'info@videomanch.com';
  const cookie = process.env.MSG91_COOKIE?.trim();
  const msgUrl = process.env.MSG91_EMAIL_API_URL?.trim() || 'https://control.msg91.com/api/v5/email/send';

  if (!authKey || !templateId || !domain) {
    console.warn('[AUTH] MSG91 email config missing. OTP email skipped; using console log fallback.');
    return;
  }

  const payload = {
    recipients: [
      {
        to: [
          {
            email,
            name: email.split('@')[0] || 'VideoManch User',
          },
        ],
        variables: {
          OTP: otp,
        },
      },
    ],
    from: {
      email: fromEmail,
    },
    domain,
    template_id: templateId,
  };

  const headers = {
    'Content-Type': 'application/json',
    authkey: authKey,
    ...(cookie ? { Cookie: cookie } : {}),
  };

  const response = await fetch(msgUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Failed to send OTP email: ${response.status} ${responseText}`);
  }
};

export const sendSignupOtpEmail = async (email, otp) => {
  return sendOtpEmail({
    email,
    otp,
    logLabel: 'Signup OTP',
    templateIdEnvKey: 'MSG91_SIGNUP_TEMPLATE_ID',
  });
};

export const sendPasswordResetOtpEmail = async (email, otp) => {
  return sendOtpEmail({
    email,
    otp,
    logLabel: 'Password reset OTP',
    templateIdEnvKey: 'MSG91_PASSWORD_RESET_TEMPLATE_ID',
  });
};
