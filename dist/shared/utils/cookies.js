"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCookies = parseCookies;
exports.getCookieValue = getCookieValue;
function parseCookies(cookieHeader) {
    if (!cookieHeader)
        return {};
    return cookieHeader
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean)
        .reduce((acc, item) => {
        const eqIndex = item.indexOf('=');
        if (eqIndex <= 0)
            return acc;
        const key = item.slice(0, eqIndex).trim();
        const value = item.slice(eqIndex + 1).trim();
        if (!key)
            return acc;
        try {
            acc[key] = decodeURIComponent(value);
        }
        catch {
            acc[key] = value;
        }
        return acc;
    }, {});
}
function getCookieValue(req, key) {
    const cookies = parseCookies(req.headers.cookie);
    return cookies[key];
}
//# sourceMappingURL=cookies.js.map