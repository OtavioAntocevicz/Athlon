import type { Response } from "express";
import { setAuthCookies } from "../../lib/auth-cookies.js";

type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: unknown;
};

/** Define cookies httpOnly e devolve apenas dados públicos (sem tokens no JSON). */
export function sendAuthResponse(
  res: Response,
  auth: AuthPayload,
  extra?: Record<string, unknown>,
  status = 200,
): void {
  setAuthCookies(res, auth.accessToken, auth.refreshToken);
  res.status(status).json({
    data: {
      user: auth.user,
      ...extra,
    },
  });
}
