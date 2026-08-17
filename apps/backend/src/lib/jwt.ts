import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { JwtPayload } from "../middleware/auth.js";

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "15m" });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: "7d" });
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as JwtPayload;
}

export interface MfaPendingPayload {
  sub: string;
  purpose: "mfa_pending";
}

export function signMfaPendingToken(userId: string): string {
  return jwt.sign({ sub: userId, purpose: "mfa_pending" }, env.jwtSecret, {
    expiresIn: "5m",
  });
}

export function verifyMfaPendingToken(token: string): MfaPendingPayload {
  const payload = jwt.verify(token, env.jwtSecret) as MfaPendingPayload;
  if (payload.purpose !== "mfa_pending") {
    throw new Error("Invalid MFA pending token");
  }
  return payload;
}
