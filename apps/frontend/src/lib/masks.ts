export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Formata centavos como "150,00" (pt-BR, sem símbolo). */
export function formatCentavosInput(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Máscara monetária BRL a partir dos dígitos digitados → "150,00". */
export function maskCurrencyBRL(value: string): string {
  const digits = digitsOnly(value).slice(0, 9);
  if (!digits) return "";
  return formatCentavosInput(parseInt(digits, 10));
}

/** Converte "150,00" / "1.150,00" em centavos. */
export function parseReaisToCentavos(value: string): number | null {
  const digits = digitsOnly(value);
  if (!digits) return null;
  const centavos = parseInt(digits, 10);
  return centavos > 0 ? centavos : null;
}

/**
 * Telefone BR: (41) 91234-5678 (celular) ou (41) 3123-4567 (fixo).
 * Aceita dígitos crus, já mascarados ou com +55.
 */
export function maskTelefone(value: string): string {
  let d = digitsOnly(value);

  // Remove DDI 55 quando vier junto (ex: 5541912345678)
  if (d.startsWith("55") && d.length > 11) {
    d = d.slice(2);
  }
  d = d.slice(0, 11);

  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;

  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  const isMobile = rest.startsWith("9") || d.length === 11;

  if (isMobile) {
    if (rest.length <= 5) return `(${ddd}) ${rest}`;
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }

  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
}

/** Alias usado no cadastro/perfil de aluno. */
export function maskWhatsApp(value: string): string {
  return maskTelefone(value);
}

/** Celular BR: 3º dígito é 9 (DDD + 9 + 8 dígitos). */
function looksLikePhoneDigits(d: string): boolean {
  if (d.startsWith("55") && d.length >= 12) return true;
  if (d.length >= 3 && d[2] === "9") return true;
  return false;
}

/** 000.000.000-00 */
export function maskCpf(value: string): string {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** 00.000.000/0000-00 */
export function maskCnpj(value: string): string {
  const d = digitsOnly(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Formata chave PIX na digitação:
 * - e-mail / chave aleatória (com letras): sem máscara
 * - telefone (ex: 41912345678 ou +55…): (41) 91234-5678
 * - só números até 11 dígitos (não telefone): CPF
 * - 12–14 dígitos: CNPJ
 */
export function maskChavePix(value: string): string {
  if (!value) return "";
  const trimmed = value.trimStart();
  if (!trimmed) return "";

  if (trimmed.includes("@")) return trimmed.trim();
  if (/[a-zA-Z]/.test(trimmed)) return trimmed.trim();

  // Usuário começou a digitar telefone com + ou (
  if (trimmed.startsWith("+") || trimmed.startsWith("(")) {
    return maskTelefone(trimmed);
  }

  const d = digitsOnly(trimmed);
  if (!d) return "";

  if (looksLikePhoneDigits(d)) return maskTelefone(d);
  if (d.length <= 11) return maskCpf(d);
  return maskCnpj(d);
}

/** 00.000.000-0 (formato comum SP/RJ) */
export function maskRg(value: string): string {
  const d = digitsOnly(value).slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`;
}
