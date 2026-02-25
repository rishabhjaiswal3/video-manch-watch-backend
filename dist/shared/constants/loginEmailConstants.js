"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATE_VARIABLES = exports.TEMPLATE_IDS = exports.EMAIL_DOMAIN = exports.EMAIL_FROM_NAME = exports.EMAIL_FROM = exports.MSG91_EMAIL_API_URL = void 0;
// MSG91 API endpoint
exports.MSG91_EMAIL_API_URL = process.env.MSG91_EMAIL_API_URL || 'https://control.msg91.com/api/v5/email/send';
// Sender identity
exports.EMAIL_FROM = 'support@videomanch.com';
exports.EMAIL_FROM_NAME = 'VideoManch';
exports.EMAIL_DOMAIN = 'videomanch.com';
// Template IDs (defined in MSG91 dashboard)
exports.TEMPLATE_IDS = {
    OTP_LOGIN: 'videomanch_template_1',
    WELCOME: 'videomanch_welcome_1',
    PASSWORD_RESET: 'videomanch_password_reset_1',
};
// Variable names used in MSG91 templates
exports.TEMPLATE_VARIABLES = {
    OTP: 'OTP',
    USERNAME: 'USERNAME',
    RESET_LINK: 'RESET_LINK',
};
//# sourceMappingURL=loginEmailConstants.js.map