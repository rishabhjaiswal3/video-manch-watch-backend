"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_js_1 = require("../../../shared/models/User.js");
const redis_js_1 = require("../../../shared/config/redis.js");
const emailService_js_1 = require("../../../infra/email/emailService.js");
class AuthService {
    static OTP_TTL_SECONDS = 10 * 60;
    static RESET_OTP_TTL_SECONDS = 10 * 60;
    normalizeEmail(email) {
        return email.toLowerCase().trim();
    }
    buildOtpKey(role, email) {
        return `login_${role}_${email}`;
    }
    buildResetOtpKey(role, email) {
        return `password_reset_${role}_${email}`;
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    ensureRoles(user) {
        const roleSet = new Set(Array.isArray(user.roles) ? user.roles : []);
        if (user.userType)
            roleSet.add(user.userType);
        if (!roleSet.size)
            roleSet.add('user');
        user.roles = Array.from(roleSet);
        if (!user.userType || !roleSet.has(user.userType)) {
            user.userType = user.roles[0];
        }
        return user.roles;
    }
    async issueAuthTokens(user, loginRole) {
        this.ensureRoles(user);
        const selectedRole = loginRole || user.userType;
        if (!user.roles.includes(selectedRole)) {
            user.roles.push(selectedRole);
        }
        user.userType = selectedRole;
        const { accessToken, refreshToken } = this.generateTokens(user._id.toString(), user.email, selectedRole);
        user.refreshToken = await bcryptjs_1.default.hash(refreshToken, 10);
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
    generateTokens(userId, email, userType) {
        const accessSecret = process.env.JWT_SECRET;
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
        const accessExpiry = (process.env.JWT_EXPIRES_IN || '2d');
        const refreshExpiry = (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');
        const accessToken = jsonwebtoken_1.default.sign({ userId, email, userType }, accessSecret, { expiresIn: accessExpiry });
        const refreshToken = jsonwebtoken_1.default.sign({ userId, email, userType }, refreshSecret, { expiresIn: refreshExpiry });
        return { accessToken, refreshToken };
    }
    /**
     * Signup logic (Create user + tokens)
     */
    async signup(email, password) {
        const user = new User_js_1.User({ email, password, userType: 'user', roles: ['user'] });
        // Duplicate email check happens at DB level (caught by controller)
        await user.save();
        return this.issueAuthTokens(user, 'user');
    }
    /**
     * Login logic (Verify password + tokens)
     */
    async login(email, password) {
        const user = await User_js_1.User.findOne({ email });
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
    async startRoleLogin(role, email) {
        const normalizedEmail = this.normalizeEmail(email);
        const existing = await User_js_1.User.findOne({ email: normalizedEmail });
        if (existing) {
            this.ensureRoles(existing);
            return { accountExists: true, next: 'password' };
        }
        const otp = this.generateOtp();
        const redis = (0, redis_js_1.getRedisConnection)();
        const key = this.buildOtpKey(role, normalizedEmail);
        await redis.set(key, otp, 'EX', AuthService.OTP_TTL_SECONDS);
        const emailResult = await (0, emailService_js_1.sendOtpEmail)({ email: normalizedEmail, name: normalizedEmail.split('@')[0] }, otp);
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
    async loginWithRolePassword(role, email, password) {
        const normalizedEmail = this.normalizeEmail(email);
        const user = await User_js_1.User.findOne({ email: normalizedEmail });
        if (!user) {
            throw new Error('No account found for this email.');
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new Error('Invalid email or password.');
        }
        return this.issueAuthTokens(user, role);
    }
    async verifySignupOtpAndCreate(role, email, otp, password) {
        const normalizedEmail = this.normalizeEmail(email);
        const existing = await User_js_1.User.findOne({ email: normalizedEmail });
        if (existing) {
            throw new Error('Account already exists. Use password login.');
        }
        const redis = (0, redis_js_1.getRedisConnection)();
        const key = this.buildOtpKey(role, normalizedEmail);
        const storedOtp = await redis.get(key);
        if (!storedOtp) {
            throw new Error('OTP expired. Please request a new OTP.');
        }
        if (storedOtp !== otp.trim()) {
            throw new Error('Invalid OTP.');
        }
        await redis.del(key);
        const user = new User_js_1.User({
            email: normalizedEmail,
            password,
            userType: role,
            roles: [role],
        });
        await user.save();
        return this.issueAuthTokens(user, role);
    }
    async requestPasswordResetOtp(role, email) {
        const normalizedEmail = this.normalizeEmail(email);
        const user = await User_js_1.User.findOne({ email: normalizedEmail });
        if (!user) {
            throw new Error('No account found for this email.');
        }
        const otp = this.generateOtp();
        const redis = (0, redis_js_1.getRedisConnection)();
        const key = this.buildResetOtpKey(role, normalizedEmail);
        await redis.set(key, otp, 'EX', AuthService.RESET_OTP_TTL_SECONDS);
        const emailResult = await (0, emailService_js_1.sendOtpEmail)({ email: normalizedEmail, name: normalizedEmail.split('@')[0] }, otp);
        if (!emailResult.success) {
            throw new Error(emailResult.error || 'Failed to send OTP email.');
        }
        return { otpSent: true, ttlSeconds: AuthService.RESET_OTP_TTL_SECONDS };
    }
    async resetPasswordWithOtp(role, email, otp, password, currentPassword) {
        const normalizedEmail = this.normalizeEmail(email);
        const user = await User_js_1.User.findOne({ email: normalizedEmail });
        if (!user) {
            throw new Error('No account found for this email.');
        }
        const redis = (0, redis_js_1.getRedisConnection)();
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
    async refresh(token) {
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
        // 1. Verify token signature
        const decoded = jsonwebtoken_1.default.verify(token, refreshSecret);
        // 2. Find user
        const user = await User_js_1.User.findById(decoded.userId);
        if (!user || !user.refreshToken) {
            throw new Error('Invalid or expired refresh token.');
        }
        // 3. Verify token hash (prevents reuse of leaked specific token)
        const isValid = await bcryptjs_1.default.compare(token, user.refreshToken);
        if (!isValid) {
            throw new Error('Invalid refresh token.');
        }
        // 4. Generate NEW pair
        this.ensureRoles(user);
        const nextRole = user.roles.includes(decoded.userType)
            ? decoded.userType
            : user.userType;
        const { accessToken, refreshToken } = this.generateTokens(decoded.userId, decoded.email, nextRole);
        // 5. Save new hashed refresh token (invalidates old one)
        user.refreshToken = await bcryptjs_1.default.hash(refreshToken, 10);
        user.userType = nextRole;
        await user.save();
        return {
            accessToken,
            refreshToken,
            user: {
                userId: user._id.toString(),
                email: user.email,
                userType: nextRole,
            },
        };
    }
    /**
     * Logout logic (Clear refresh token)
     */
    async logout(userId) {
        await User_js_1.User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map