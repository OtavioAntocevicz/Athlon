import { AppError } from "../middleware/error-handler.js";

/** Escapa caracteres especiais para uso seguro em templates HTML de e-mail. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Garante que a URL do comprovante pertence ao pagamento informado (evita IDOR). */
export function assertArquivoUrlDoPagamento(pagamentoId: string, arquivoUrl: string): void {
  const normalized = arquivoUrl.replace(/^\/+/, "").trim();

  if (!normalized || normalized.includes("..") || normalized.includes("\\")) {
    throw new AppError(400, "INVALID_FILE", "Arquivo inválido");
  }

  const expectedPrefix = `comprovantes/${pagamentoId}/`;
  if (!normalized.startsWith(expectedPrefix)) {
    throw new AppError(400, "INVALID_FILE", "Arquivo inválido para esta mensalidade");
  }
}
