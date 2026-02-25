"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminOrCreator = exports.requireAdmin = void 0;
const authHelpers_js_1 = require("../utils/authHelpers.js");
/**
 * Middleware that requires admin role
 * Must be used AFTER authenticate middleware
 */
const requireAdmin = (req, res, next) => {
    try {
        const user = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
        if (user.userType !== 'admin') {
            res.status(403).json({
                success: false,
                error: 'Access denied. Admin privileges required.',
            });
            return;
        }
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: 'Authentication required.',
        });
    }
};
exports.requireAdmin = requireAdmin;
/**
 * Middleware that requires admin OR creator role
 * Useful for routes that should be accessible to both
 */
const requireAdminOrCreator = (req, res, next) => {
    try {
        const user = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
        if (user.userType !== 'admin' && user.userType !== 'creator') {
            res.status(403).json({
                success: false,
                error: 'Access denied. Admin or creator privileges required.',
            });
            return;
        }
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: 'Authentication required.',
        });
    }
};
exports.requireAdminOrCreator = requireAdminOrCreator;
//# sourceMappingURL=adminAuth.js.map