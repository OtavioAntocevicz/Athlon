/** Códigos de erro estáveis retornados pela API (`error.code`). */
export const ApiErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_TOKEN: "INVALID_TOKEN",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMIT: "RATE_LIMIT",
  INVALID_MFA_CODE: "INVALID_MFA_CODE",
  MFA_OBRIGATORIO: "MFA_OBRIGATORIO",
  MISSING_TOKEN: "MISSING_TOKEN",
} as const;

export type ApiErrorCode = (typeof ApiErrorCodes)[keyof typeof ApiErrorCodes];
