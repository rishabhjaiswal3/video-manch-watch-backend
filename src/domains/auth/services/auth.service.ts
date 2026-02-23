import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../../../models/User.js';
import { getRedisConnection } from '../../../config/redis.js';
import { sendOtpEmail } from '../../../services/emailService.js';

export interface AuthSuccess {
    user: {
        id: string;
        email: string;
        userType: 'user' | 'creator' | 'admin';
    };
    accessToken: string;
    refreshToken: string;
}

export class AuthService {
    private static readonly OTP_TTL_SECONDS = 10 * 60;

    private normalizeEmail(email: string): string {
        return email.toLowerCase().trim();
    }

    private buildOtpKey(role: 'user' | 'creator', email: string): string {
        return `login_${role}_${email}`;
    }

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Helper to generate tokens
     */
    private generateTokens(userId: string, email: string, userType: string) {
        const accessSecret = process.env.JWT_SECRET!;
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET!;
        const accessExpiry = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
        const refreshExpiry = (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

        const accessToken = jwt.sign({ userId, email, userType }, accessSecret, { expiresIn: accessExpiry });
        const refreshToken = jwt.sign({ userId, email, userType }, refreshSecret, { expiresIn: refreshExpiry });

        return { accessToken, refreshToken };
    }

    /**
     * Signup logic (Create user + tokens)
     */
    async signup(email: string, password: string): Promise<AuthSuccess> {
        const user = new User({ email, password });

        // Duplicate email check happens at DB level (caught by controller)
        await user.save();

        const { accessToken, refreshToken } = this.generateTokens(user._id.toString(), user.email, user.userType);

        // Hash refresh token (security)
        user.refreshToken = await bcrypt.hash(refreshToken, 10);
        await user.save();

        return {
            user: {
                id: user._id.toString(),
                email: user.email,
                userType: user.userType,
            },
            accessToken,
            refreshToken,
        };
    }

    /**
     * Login logic (Verify password + tokens)
     */
    async login(email: string, password: string): Promise<AuthSuccess> {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid email or password.');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new Error('Invalid email or password.');
        }

        const { accessToken, refreshToken } = this.generateTokens(user._id.toString(), user.email, user.userType);

        user.refreshToken = await bcrypt.hash(refreshToken, 10);
        await user.save();

        return {
            user: {
                id: user._id.toString(),
                email: user.email,
                userType: user.userType,
            },
            accessToken,
            refreshToken,
        };
    }

    /**
     * Send OTP for role-based login.
     * Request body pattern:
     *   { email } -> sends OTP and stores in Redis with TTL.
     */
    async requestLoginOtp(role: 'user' | 'creator', email: string): Promise<{ otpSent: boolean; ttlSeconds: number }> {
        const normalizedEmail = this.normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail, userType: role });
        if (!user) {
            throw new Error(`No ${role} account found for this email.`);
        }

        const otp = this.generateOtp();
        const redis = getRedisConnection();
        const key = this.buildOtpKey(role, normalizedEmail);

        await redis.set(key, otp, 'EX', AuthService.OTP_TTL_SECONDS);

        const emailResult = await sendOtpEmail(
            { email: normalizedEmail, name: normalizedEmail.split('@')[0] },
            otp
        );

        if (!emailResult.success) {
            throw new Error(emailResult.error || 'Failed to send OTP email.');
        }

        return { otpSent: true, ttlSeconds: AuthService.OTP_TTL_SECONDS };
    }

    /**
     * Verify OTP and return auth tokens.
     * Request body pattern:
     *   { email, otp } -> verifies OTP and logs user in.
     */
    async verifyLoginOtp(role: 'user' | 'creator', email: string, otp: string): Promise<AuthSuccess> {
        const normalizedEmail = this.normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail, userType: role });
        if (!user) {
            throw new Error(`No ${role} account found for this email.`);
        }

        const redis = getRedisConnection();
        const key = this.buildOtpKey(role, normalizedEmail);
        const storedOtp = await redis.get(key);

        if (!storedOtp) {
            throw new Error('OTP expired. Please request a new OTP.');
        }

        if (storedOtp !== otp.trim()) {
            throw new Error('Invalid OTP.');
        }

        await redis.del(key);

        const { accessToken, refreshToken } = this.generateTokens(user._id.toString(), user.email, user.userType);

        user.refreshToken = await bcrypt.hash(refreshToken, 10);
        await user.save();

        return {
            user: {
                id: user._id.toString(),
                email: user.email,
                userType: user.userType,
            },
            accessToken,
            refreshToken,
        };
    }

    /**
     * Refresh token logic (Token rotation)
     */
    async refresh(token: string) {
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET!;

        // 1. Verify token signature
        const decoded = jwt.verify(token, refreshSecret) as { userId: string; email: string; userType: string };

        // 2. Find user
        const user = await User.findById(decoded.userId);
        if (!user || !user.refreshToken) {
            throw new Error('Invalid or expired refresh token.');
        }

        // 3. Verify token hash (prevents reuse of leaked specific token)
        const isValid = await bcrypt.compare(token, user.refreshToken);
        if (!isValid) {
            throw new Error('Invalid refresh token.');
        }

        // 4. Generate NEW pair
        const { accessToken, refreshToken } = this.generateTokens(decoded.userId, decoded.email, decoded.userType);

        // 5. Save new hashed refresh token (invalidates old one)
        user.refreshToken = await bcrypt.hash(refreshToken, 10);
        await user.save();

        return { accessToken, refreshToken };
    }

    /**
     * Logout logic (Clear refresh token)
     */
    async logout(userId: string) {
        await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    }
}
