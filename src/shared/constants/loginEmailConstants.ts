// MSG91 API endpoint
export const MSG91_EMAIL_API_URL =
  process.env.MSG91_EMAIL_API_URL || 'https://control.msg91.com/api/v5/email/send';

// Sender identity
export const EMAIL_FROM = 'support@videomanch.com';
export const EMAIL_FROM_NAME = 'VideoManch';
export const EMAIL_DOMAIN = 'videomanch.com';

// Template IDs (defined in MSG91 dashboard)
export const TEMPLATE_IDS = {
  OTP_LOGIN: 'videomanch_template_1',
  WELCOME: 'videomanch_welcome_1',
  PASSWORD_RESET: 'videomanch_password_reset_1',
} as const;

// Variable names used in MSG91 templates
export const TEMPLATE_VARIABLES = {
  OTP: 'OTP',
  USERNAME: 'USERNAME',
  RESET_LINK: 'RESET_LINK',
} as const;

