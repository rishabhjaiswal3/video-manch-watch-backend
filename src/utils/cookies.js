import { ACCESS_COOKIE } from '../constants/auth/cookies.js';

export const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const eqIndex = item.indexOf('=');
      if (eqIndex <= 0) return acc;
      const key = item.slice(0, eqIndex).trim();
      const value = item.slice(eqIndex + 1).trim();
      if (!key) return acc;
      try { acc[key] = decodeURIComponent(value); } catch { acc[key] = value; }
      return acc;
    }, {});
};

export const getCookieValue = (req, key) => {
  return parseCookies(req.headers.cookie)[key];
};

export { ACCESS_COOKIE };
