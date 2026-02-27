"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: 'Access denied. No token provided.',
        });
        return;
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({
            success: false,
            error: 'Access denied. Malformed authorization header.',
        });
        return;
    }
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const roleSet = new Set(decoded.roles || []);
        roleSet.add(decoded.userType);
        const authenticatedUser = {
            userId: decoded.userId,
            email: decoded.email,
            userType: decoded.userType,
            roles: Array.from(roleSet),
        };
        req.user = authenticatedUser;
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({
                success: false,
                error: 'Token expired. Please refresh your token.',
            });
            return;
        }
        if (error.name === 'JsonWebTokenError') {
            res.status(401).json({
                success: false,
                error: 'Invalid token.',
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Authentication failed.',
        });
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.js.map