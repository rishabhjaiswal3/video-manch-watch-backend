import { Request } from 'express';

export function parseCookies(cookieHeader?: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, item) => {
      const eqIndex = item.indexOf('=');
      if (eqIndex <= 0) return acc;
      const key = item.slice(0, eqIndex).trim();
      const value = item.slice(eqIndex + 1).trim();
      if (!key) return acc;
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
      return acc;
    }, {});
}

export function getCookieValue(req: Request, key: string): string | undefined {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[key];
}

