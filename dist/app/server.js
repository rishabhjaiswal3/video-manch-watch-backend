"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const rateLimiter_js_1 = require("../shared/middleware/rateLimiter.js");
const errorHandler_js_1 = require("../shared/middleware/errorHandler.js");
const routes_js_1 = require("./routes.js");
function createServer(allowedOrigins, nodeEnv, trustProxyHops) {
    const app = (0, express_1.default)();
    if (Number.isFinite(trustProxyHops) && trustProxyHops > 0) {
        app.set('trust proxy', trustProxyHops);
    }
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            service: 'videomanch-api',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                console.log(`[CORS] Blocked origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    }));
    // Baseline hardening headers without adding new dependencies.
    app.disable('x-powered-by');
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        if (nodeEnv === 'production') {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
            res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; object-src 'none'");
        }
        next();
    });
    // Enforce HTTPS in production behind proxy (Railway/Cloudflare etc.).
    if (nodeEnv === 'production') {
        app.use((req, res, next) => {
            const proto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
            if (proto && proto !== 'https') {
                return res.status(403).json({ success: false, error: 'HTTPS required.' });
            }
            next();
        });
    }
    app.use(express_1.default.json({ limit: '35mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '35mb' }));
    app.use(rateLimiter_js_1.apiLimiter);
    if (nodeEnv !== 'production') {
        app.use((req, res, next) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
            next();
        });
    }
    (0, routes_js_1.registerRoutes)(app);
    app.use(errorHandler_js_1.notFoundHandler);
    app.use(errorHandler_js_1.globalErrorHandler);
    return app;
}
//# sourceMappingURL=server.js.map