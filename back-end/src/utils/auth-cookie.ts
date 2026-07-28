import type { Request, Response } from 'express';

export const AUTH_COOKIE_NAME = 'fs_session';
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const readCookie = (cookieHeader: string | undefined, name: string) => {
  if (!cookieHeader) return '';
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key === name) return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return '';
};

export const getAuthToken = (req: Pick<Request, 'headers'>) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const parts = authorization.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  }
  return readCookie(req.headers.cookie, AUTH_COOKIE_NAME);
};

export const setAuthCookie = (res: Response, token: string) => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });
};

export const clearAuthCookie = (res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
};
