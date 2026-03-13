export interface AuthSuccess {
    user: {
        id: string;
        userId: string;
        email: string;
        userType: 'user' | 'creator' | 'admin';
        roles: Array<'user' | 'creator' | 'admin'>;
    };
    accessToken: string;
    refreshToken: string;
}
export declare class AuthService {
    private static readonly OTP_TTL_SECONDS;
    private static readonly RESET_OTP_TTL_SECONDS;
    private normalizeEmail;
    private buildOtpKey;
    private buildResetOtpKey;
    private generateOtp;
    private ensureRoles;
    private issueAuthTokens;
    /**
     * Helper to generate tokens
     */
    private generateTokens;
    /**
     * Signup logic (Create user + tokens)
     */
    signup(email: string, password: string): Promise<AuthSuccess>;
    startSignup(role: 'user' | 'creator', email: string): Promise<{
        otpSent: boolean;
        ttlSeconds: number;
    }>;
    /**
     * Login logic (Verify password + tokens)
     */
    login(email: string, password: string): Promise<AuthSuccess>;
    startRoleLogin(role: 'user' | 'creator', email: string): Promise<{
        accountExists: boolean;
        next: 'password' | 'otp';
        otpSent?: boolean;
        ttlSeconds?: number;
    }>;
    loginWithRolePassword(role: 'user' | 'creator', email: string, password: string): Promise<AuthSuccess>;
    verifySignupOtpAndCreate(role: 'user' | 'creator', email: string, otp: string, password: string): Promise<AuthSuccess>;
    requestPasswordResetOtp(role: 'user' | 'creator', email: string): Promise<{
        otpSent: boolean;
        ttlSeconds: number;
    }>;
    resetPasswordWithOtp(role: 'user' | 'creator', email: string, otp: string, password: string, currentPassword?: string): Promise<{
        updated: boolean;
    }>;
    /**
     * Refresh token logic (Token rotation)
     */
    refresh(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            userId: string;
            email: string;
            userType: "user" | "creator" | "admin";
            roles: ("user" | "creator" | "admin")[];
        };
    }>;
    /**
     * Logout logic (Clear refresh token)
     */
    logout(userId: string): Promise<void>;
}
//# sourceMappingURL=auth.service.d.ts.map