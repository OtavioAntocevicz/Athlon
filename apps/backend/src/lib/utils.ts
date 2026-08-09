import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export function gerarCodigoConvite(): string {
  return nanoid();
}

export function calcularVencimento(
  mesReferencia: Date,
  diaVencimento: number,
): Date {
  const year = mesReferencia.getFullYear();
  const month = mesReferencia.getMonth();
  const day = Math.min(diaVencimento, 28);
  return new Date(year, month, day);
}

export function inicioDoMes(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMeses(date: Date, meses: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + meses, 1);
}

export function formatMesReferencia(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** Data calendário YYYY-MM-01 sem deslocar fuso (mês de referência). */
export function toMesReferenciaDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** Data calendário YYYY-MM-DD a partir de Date local (ex.: resultado de calcularVencimento). */
export function toDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Extrai YYYY-MM-DD de DATE/ISO sem deslocar o dia civil. */
export function chaveDiaFromIso(iso: string | Date): string {
  if (iso instanceof Date) {
    if (Number.isNaN(iso.getTime())) return "";
    return iso.toISOString().slice(0, 10);
  }
  const s = String(iso ?? "");
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}

export function chaveDiaCalendario(date: Date = new Date()): string {
  return toDateOnly(date);
}

export function chaveMesCalendario(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Extrai YYYY-MM de string ISO ou Date do pg (TIMESTAMP/DATE).
 * node-pg devolve Date; chamar .slice em Date quebrava o dashboard do aluno (500).
 */
export function chaveMesFromIso(iso: string | Date): string {
  if (iso instanceof Date) {
    if (Number.isNaN(iso.getTime())) return "";
    return iso.toISOString().slice(0, 7);
  }

  const s = String(iso ?? "");
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 7);
  return s.slice(0, 7);
}

export function isMesFuturo(
  mesReferenciaIso: string | Date,
  hoje: Date = new Date(),
): boolean {
  return chaveMesFromIso(mesReferenciaIso) > chaveMesCalendario(hoje);
}

export function toIsoSafe(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
