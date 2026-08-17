import type { CookieOptions, Request, Response } from "express";
import { env } from "../config/env.js";

export const ACCESS_COOKIE = "athlon_access";
export const REFRESH_COOKIE = "athlon_refresh";

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    domain: env.cookieDomain ?? undefined,
    path: "/",
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const base = baseCookieOptions();
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: ACCESS_MAX_AGE_MS });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base, maxAge: REFRESH_MAX_AGE_MS });
}

export function clearAuthCookies(res: Response): void {
  const base = baseCookieOptions();
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}

export function getAccessTokenFromRequest(req: Request): string | null {
  const fromCookie = req.cookies?.[ACCESS_COOKIE];
  if (typeof fromCookie === "string" && fromCookie.length > 0) return fromCookie;

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);

  return null;
}

export function getRefreshTokenFromRequest(req: Request): string | null {
  const fromCookie = req.cookies?.[REFRESH_COOKIE];
  if (typeof fromCookie === "string" && fromCookie.length > 0) return fromCookie;

  const body = req.body as { refreshToken?: string } | undefined;
  if (typeof body?.refreshToken === "string" && body.refreshToken.length > 0) {
    return body.refreshToken;
  }

  return null;
}
