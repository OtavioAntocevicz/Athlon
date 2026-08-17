import rateLimit from "express-rate-limit";

/** Limite global da API — protege contra abuso automatizado. */
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT", message: "Muitas requisições. Tente novamente em instantes." } },
});

/** Limite para renovação de tokens — reduz brute-force de refresh tokens. */
export const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT", message: "Muitas tentativas de renovação de sessão" } },
});

/** Limite para tentativas de código de convite de turma. */
export const inviteCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT", message: "Muitas tentativas de código de turma" } },
});
