/**
 * MSG91 Email API Constants
 *
 * Reference curl:
 *
 * curl --location 'https://control.msg91.com/api/v5/email/send' \
 * --header 'Content-Type: application/json' \
 * --header 'authkey: YOUR_MSG91_AUTH_KEY' \
 * --data-raw '{
 *   "recipients": [
 *     {
 *       "to": [{ "email": "ronit.sde@gmail.com", "name": "Rishabh Jaiswal" }],
 *       "variables": { "OTP": "6534" }
 *     }
 *   ],
 *   "from": { "email": "support@videomanch.com" },
 *   "domain": "videomanch.com",
 *   "template_id": "videomanch_template_1"
 * }'
 */

// MSG91 API endpoint
export const MSG91_EMAIL_API_URL = process.env.MSG91_EMAIL_API_URL || 'https://control.msg91.com/api/v5/email/send';
// Sender identity
export const EMAIL_FROM = 'support@videomanch.com';
export const EMAIL_FROM_NAME = 'VideoManch';
export const EMAIL_DOMAIN = 'videomanch.com';

// Template IDs (defined in MSG91 dashboard)
export const TEMPLATE_IDS = {
  OTP_LOGIN: 'videomanch_template_1',
  WELCOME: 'videomanch_welcome_1',
  PASSWORD_RESET: 'videomanch_password_reset_1',
};

// Variable names used in MSG91 templates
export const TEMPLATE_VARIABLES = {
  OTP: 'OTP',
  USERNAME: 'USERNAME',
  RESET_LINK: 'RESET_LINK',
};

// Auth key — loaded from env at runtime (set MSG91_AUTH_KEY in your .env)
export const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY ?? '';
