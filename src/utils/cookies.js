import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_FALLBACK_MAX_AGE_MS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_FALLBACK_MAX_AGE_MS,
} from '../constants/auth/cookies.js';

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

export const getCookieBaseOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSite = (process.env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase();
  const configuredDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  const isLocalDevDomain = configuredDomain
    ? configuredDomain.includes('localhost') || configuredDomain.includes('127.0.0.1')
    : false;
  // Prevent invalid cookie domain on local development (e.g. ".videomanch.com" on localhost)
  const domain = isProd && configuredDomain && !isLocalDevDomain ? configuredDomain : undefined;

  return {
    httpOnly: true,
    secure: isProd || sameSite === 'none',
    sameSite,
    path: '/',
    ...(domain ? { domain } : {}),
  };
};

export const setAuthCookies = (res, auth, parseDurationToMs) => {
  const base = getCookieBaseOptions();
  res.cookie(ACCESS_COOKIE, auth.accessToken, {
    ...base,
    maxAge: parseDurationToMs(process.env.JWT_EXPIRES_IN, ACCESS_COOKIE_FALLBACK_MAX_AGE_MS),
  });
  res.cookie(REFRESH_COOKIE, auth.refreshToken, {
    ...base,
    maxAge: parseDurationToMs(process.env.REFRESH_TOKEN_EXPIRES_IN, REFRESH_COOKIE_FALLBACK_MAX_AGE_MS),
  });
};

export const clearAuthCookies = (res) => {
  const base = getCookieBaseOptions();
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
};
