"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const routes_js_1 = __importDefault(require("../domains/auth/routes.js"));
const upload_routes_js_1 = __importDefault(require("../domains/media/upload.routes.js"));
const videos_routes_js_1 = __importDefault(require("../domains/media/videos.routes.js"));
const playback_routes_js_1 = __importDefault(require("../domains/analytics/playback.routes.js"));
const creator_routes_js_1 = __importDefault(require("../domains/analytics/creator.routes.js"));
const admin_routes_js_1 = __importDefault(require("../domains/admin/admin.routes.js"));
const config_routes_js_1 = __importDefault(require("../domains/admin/config.routes.js"));
const profile_routes_js_1 = __importDefault(require("../domains/social/profile.routes.js"));
const engagement_routes_js_1 = __importDefault(require("../domains/social/engagement.routes.js"));
const subscription_routes_js_1 = __importDefault(require("../domains/social/subscription.routes.js"));
const comment_routes_js_1 = __importDefault(require("../domains/social/comment.routes.js"));
const watchLater_routes_js_1 = __importDefault(require("../domains/social/watchLater.routes.js"));
function registerRoutes(app) {
    app.use('/auth', routes_js_1.default);
    app.use('/upload', upload_routes_js_1.default);
    app.use('/videos', videos_routes_js_1.default);
    app.use('/playback', playback_routes_js_1.default);
    app.use('/analytics', creator_routes_js_1.default);
    app.use('/admin', admin_routes_js_1.default);
    app.use('/config', config_routes_js_1.default);
    app.use('/profile', profile_routes_js_1.default);
    app.use('/engagement', engagement_routes_js_1.default);
    app.use('/subscriptions', subscription_routes_js_1.default);
    app.use('/comments', comment_routes_js_1.default);
    app.use('/watch-later', watchLater_routes_js_1.default);
}
//# sourceMappingURL=routes.js.map