export interface AuthSuccess {
    user: {
        id: string;
        email: string;
        userType: 'user' | 'creator' | 'admin';
    };
    accessToken: string;
    refreshToken: string;
}
export declare class AuthService {
    /**
     * Helper to generate tokens
     */
    private generateTokens;
    /**
     * Signup logic (Create user + tokens)
     */
    signup(email: string, password: string): Promise<AuthSuccess>;
    /**
     * Login logic (Verify password + tokens)
     */
    login(email: string, password: string): Promise<AuthSuccess>;
    /**
     * Refresh token logic (Token rotation)
     */
    refresh(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Logout logic (Clear refresh token)
     */
    logout(userId: string): Promise<void>;
}
//# sourceMappingURL=auth.service.d.ts.map