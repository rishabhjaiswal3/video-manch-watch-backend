import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../../../shared/models/User.js';
import { getRedisConnection } from '../../../shared/config/redis.js';
import { sendOtpEmail } from '../../../infra/email/emailService.js';

export interface AuthSuccess {
    user: {
        id: string;
        userId: string;
        email: string;
        userType: 'user' | 'creator' | 'admin';
    };
    accessToken: string;
    refreshToken: string;
}

export class AuthService {
    private static readonly OTP_TTL_SECONDS = 10 * 60;

    private static readonly RESET_OTP_TTL_SECONDS = 10 * 60;

    private normalizeEmail(email: string): string {
        return email.toLowerCase().trim();
    }

    private buildOtpKey(role: 'user' | 'creator', email: string): string {
        return `login_${role}_${email}`;
    }

    private buildResetOtpKey(role: 'user' | 'creator', email: string): string {
        return `password_reset_${role}_${email}`;
    }

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private ensureRoles(user: any): Array<'user' | 'creator' | 'admin'> {
        const roleSet = new Set<string>(Array.isArray(user.roles) ? user.roles : []);
        if (user.userType) roleSet.add(user.userType);
        if (!roleSet.size) roleSet.add('user');
        user.roles = Array.from(roleSet);
        if (!user.userType || !roleSet.has(user.userType)) {
            user.userType = user.roles[0];
        }
        return user.roles;
    }

    private async issueAuthTokens(
        user: any,
        loginRole?: 'user' | 'creator' | 'admin'
    ): Promise<AuthSuccess> {
        this.ensureRoles(user);
        const selectedRole = loginRole || user.userType;
        if (!user.roles.includes(selectedRole)) {
            user.roles.push(selectedRole);
        }
        user.userType = selectedRole;
        const { accessToken, refreshToken } = this.generateTokens(user._id.toString(), user.email, selectedRole);
        user.refreshToken = await bcrypt.hash(refreshToken, 10);
        await user.save();

        return {
            user: {
                id: user._id.toString(),
                userId: user._id.toString(),
                email: user.email,
                userType: selectedRole,
            },
            accessToken,
            refreshToken,
        };
    }

    /**
     * Helper to generate tokens
     */
    private generateTokens(userId: string, email: string, userType: string) {
        const accessSecret = process.env.JWT_SECRET!;
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET!;
        const accessExpiry = (process.env.JWT_EXPIRES_IN || '2d') as jwt.SignOptions['expiresIn'];
        const refreshExpiry = (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

        const accessToken = jwt.sign({ userId, email, userType }, accessSecret, { expiresIn: accessExpiry });
        const refreshToken = jwt.sign({ userId, email, userType }, refreshSecret, { expiresIn: refreshExpiry });

        return { accessToken, refreshToken };
    }

    /**
     * Signup logic (Create user + tokens)
     */
    async signup(email: string, password: string): Promise<AuthSuccess> {
        const user = new User({ email, password, userType: 'user', roles: ['user'] });

        // Duplicate email check happens at DB level (caught by controller)
        await user.save();

        return this.issueAuthTokens(user, 'user');
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

        this.ensureRoles(user);
        return this.issueAuthTokens(user, user.userType);
    }

    async startRoleLogin(role: 'user' | 'creator', email: string): Promise<{
        accountExists: boolean;
        next: 'password' | 'otp';
        otpSent?: boolean;
        ttlSeconds?: number;
    }> {
        const normalizedEmail = this.normalizeEmail(email);

        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            this.ensureRoles(existing);
            return { accountExists: true, next: 'password' };
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

        return {
            accountExists: false,
            next: 'otp',
            otpSent: true,
            ttlSeconds: AuthService.OTP_TTL_SECONDS,
        };
    }

    async loginWithRolePassword(role: 'user' | 'creator', email: string, password: string): Promise<AuthSuccess> {
        const normalizedEmail = this.normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            throw new Error('No account found for this email.');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new Error('Invalid email or password.');
        }

        return this.issueAuthTokens(user, role);
    }

    async verifySignupOtpAndCreate(
        role: 'user' | 'creator',
        email: string,
        otp: string,
        password: string
    ): Promise<AuthSuccess> {
        const normalizedEmail = this.normalizeEmail(email);
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            throw new Error('Account already exists. Use password login.');
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

        const user = new User({
            email: normalizedEmail,
            password,
            userType: role,
            roles: [role],
        });
        await user.save();

        return this.issueAuthTokens(user, role);
    }

    async requestPasswordResetOtp(role: 'user' | 'creator', email: string): Promise<{ otpSent: boolean; ttlSeconds: number }> {
        const normalizedEmail = this.normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            throw new Error('No account found for this email.');
        }

        const otp = this.generateOtp();
        const redis = getRedisConnection();
        const key = this.buildResetOtpKey(role, normalizedEmail);
        await redis.set(key, otp, 'EX', AuthService.RESET_OTP_TTL_SECONDS);

        const emailResult = await sendOtpEmail(
            { email: normalizedEmail, name: normalizedEmail.split('@')[0] },
            otp
        );

        if (!emailResult.success) {
            throw new Error(emailResult.error || 'Failed to send OTP email.');
        }

        return { otpSent: true, ttlSeconds: AuthService.RESET_OTP_TTL_SECONDS };
    }

    async resetPasswordWithOtp(
        role: 'user' | 'creator',
        email: string,
        otp: string,
        password: string,
        currentPassword?: string
    ): Promise<{ updated: boolean }> {
        const normalizedEmail = this.normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            throw new Error('No account found for this email.');
        }

        const redis = getRedisConnection();
        const key = this.buildResetOtpKey(role, normalizedEmail);
        const storedOtp = await redis.get(key);

        if (!storedOtp) {
            throw new Error('OTP expired. Please request a new OTP.');
        }

        if (storedOtp !== otp.trim()) {
            throw new Error('Invalid OTP.');
        }

        if (currentPassword) {
            const isCurrentValid = await user.comparePassword(currentPassword);
            if (!isCurrentValid) {
                throw new Error('Current password is incorrect.');
            }
        }

        user.password = password;
        user.refreshToken = undefined;
        await user.save();
        await redis.del(key);

        return { updated: true };
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
        this.ensureRoles(user);
        const nextRole = user.roles.includes(decoded.userType as any)
            ? decoded.userType
            : user.userType;
        const { accessToken, refreshToken } = this.generateTokens(decoded.userId, decoded.email, nextRole);

        // 5. Save new hashed refresh token (invalidates old one)
        user.refreshToken = await bcrypt.hash(refreshToken, 10);
        user.userType = nextRole as 'user' | 'creator' | 'admin';
        await user.save();

        return {
            accessToken,
            refreshToken,
            user: {
                userId: user._id.toString(),
                email: user.email,
                userType: nextRole as 'user' | 'creator' | 'admin',
            },
        };
    }

    /**
     * Logout logic (Clear refresh token)
     */
    async logout(userId: string) {
        await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    }
}
