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

export function chaveMesCalendario(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function chaveMesFromIso(iso: string): string {
  return iso.slice(0, 7);
}

export function isMesFuturo(mesReferenciaIso: string, hoje: Date = new Date()): boolean {
  return chaveMesFromIso(mesReferenciaIso) > chaveMesCalendario(hoje);
}
