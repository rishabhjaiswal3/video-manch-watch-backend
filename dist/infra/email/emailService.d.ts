interface Recipient {
    email: string;
    name?: string;
}
interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
export declare function sendOtpEmail(to: Recipient, otp: string): Promise<EmailResult>;
declare const _default: {
    sendOtpEmail: typeof sendOtpEmail;
};
export default _default;
//# sourceMappingURL=emailService.d.ts.map