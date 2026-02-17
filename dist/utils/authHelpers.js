"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAuthenticatedUser = void 0;
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const ensureAuthenticatedUser = (req) => {
    if (!req.user) {
        throw new errorHandler_js_1.AppError('Authentication required', 401);
    }
    return req.user;
};
exports.ensureAuthenticatedUser = ensureAuthenticatedUser;
//# sourceMappingURL=authHelpers.js.map