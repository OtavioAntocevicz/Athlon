import { env } from "../config/env.js";

let vapidConfigured = false;

export function getVapidPublicKey(): string | null {
  return env.vapidPublicKey;
}
