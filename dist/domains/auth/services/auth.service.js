"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_js_1 = require("../../../models/User.js");
class AuthService {
    /**
     * Helper to generate tokens
     */
    generateTokens(userId, email, userType) {
        const accessSecret = process.env.JWT_SECRET;
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
        const accessExpiry = (process.env.JWT_EXPIRES_IN || '15m');
        const refreshExpiry = (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');
        const accessToken = jsonwebtoken_1.default.sign({ userId, email, userType }, accessSecret, { expiresIn: accessExpiry });
        const refreshToken = jsonwebtoken_1.default.sign({ userId, email, userType }, refreshSecret, { expiresIn: refreshExpiry });
        return { accessToken, refreshToken };
    }
    /**
     * Signup logic (Create user + tokens)
     */
    async signup(email, password) {
        const user = new User_js_1.User({ email, password });
        // Duplicate email check happens at DB level (caught by controller)
        await user.save();
        const { accessToken, refreshToken } = this.generateTokens(user._id.toString(), user.email, user.userType);
        // Hash refresh token (security)
        user.refreshToken = await bcryptjs_1.default.hash(refreshToken, 10);
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
    async login(email, password) {
        const user = await User_js_1.User.findOne({ email });
        if (!user) {
            throw new Error('Invalid email or password.');
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new Error('Invalid email or password.');
        }
        const { accessToken, refreshToken } = this.generateTokens(user._id.toString(), user.email, user.userType);
        user.refreshToken = await bcryptjs_1.default.hash(refreshToken, 10);
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
        const { accessToken, refreshToken } = this.generateTokens(decoded.userId, decoded.email, decoded.userType);
        // 5. Save new hashed refresh token (invalidates old one)
        user.refreshToken = await bcryptjs_1.default.hash(refreshToken, 10);
        await user.save();
        return { accessToken, refreshToken };
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