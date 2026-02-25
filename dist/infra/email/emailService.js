"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpEmail = sendOtpEmail;
const loginEmailConstants_js_1 = require("../../shared/constants/loginEmailConstants.js");
async function sendEmail(options) {
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
            email: loginEmailConstants_js_1.EMAIL_FROM,
            name: loginEmailConstants_js_1.EMAIL_FROM_NAME,
        },
        domain: loginEmailConstants_js_1.EMAIL_DOMAIN,
        template_id: options.templateId,
    };
    try {
        const keyFingerprint = `${authKey.slice(0, 4)}...${authKey.slice(-2)} (len=${authKey.length})`;
        console.log('[EmailService] Sending MSG91 email', {
            url: loginEmailConstants_js_1.MSG91_EMAIL_API_URL,
            templateId: options.templateId,
            recipients: recipients.map((r) => r.email),
            keyFingerprint,
        });
        const response = await fetch(loginEmailConstants_js_1.MSG91_EMAIL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                authkey: authKey,
            },
            body: JSON.stringify(body),
        });
        let data = {};
        try {
            data = (await response.json());
        }
        catch {
            data = {};
        }
        if (!response.ok) {
            const detailedError = data.errors ||
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
    }
    catch (err) {
        console.error('[EmailService] Network error:', err.message);
        return { success: false, error: err.message };
    }
}
async function sendOtpEmail(to, otp) {
    return sendEmail({
        to,
        templateId: loginEmailConstants_js_1.TEMPLATE_IDS.OTP_LOGIN,
        variables: { [loginEmailConstants_js_1.TEMPLATE_VARIABLES.OTP]: otp },
    });
}
exports.default = { sendOtpEmail };
//# sourceMappingURL=emailService.js.map