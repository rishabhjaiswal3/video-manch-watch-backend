import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../../../models/User.js';

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
