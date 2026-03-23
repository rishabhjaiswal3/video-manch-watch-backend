export const signupOtpKey = (email) => `auth:signup:otp:${email}`;
export const signupOtpAttemptKey = (email) => `auth:signup:otp:attempts:${email}`;
export const signupOtpBlockKey = (email) => `auth:signup:otp:block:${email}`;
export const signupOtpCooldownKey = (email) => `auth:signup:otp:cooldown:${email}`;
export const signupOtpSendCountKey = (email) => `auth:signup:otp:sendcount:${email}`;
export const signupOtpIpSendCountKey = (ipAddress) => `auth:signup:otp:ipcount:${ipAddress}`;
export const signupOtpDispatchLockKey = (email) => `auth:signup:otp:dispatch:${email}`;

export const passwordResetOtpKey = (email) => `auth:password-reset:otp:${email}`;
export const passwordResetOtpAttemptKey = (email) => `auth:password-reset:otp:attempts:${email}`;
export const passwordResetOtpBlockKey = (email) => `auth:password-reset:otp:block:${email}`;
export const passwordResetOtpCooldownKey = (email) => `auth:password-reset:otp:cooldown:${email}`;
export const passwordResetOtpSendCountKey = (email) => `auth:password-reset:otp:sendcount:${email}`;
export const passwordResetOtpIpSendCountKey = (ipAddress) => `auth:password-reset:otp:ipcount:${ipAddress}`;
export const passwordResetOtpDispatchLockKey = (email) => `auth:password-reset:otp:dispatch:${email}`;
