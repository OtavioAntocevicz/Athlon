import { Swords, Trophy } from "lucide-react";
import { TipoEvento } from "@athlon/shared-types";

export function labelTipoEvento(tipo: string): string {
  return tipo === TipoEvento.CAMPEONATO ? "Campeonato" : "Amistoso";
}

export function eventoTipoStyles(tipo: string) {
  if (tipo === TipoEvento.CAMPEONATO) {
    return {
      Icon: Trophy,
      badgeClass: "bg-amber-100 text-amber-800",
      cardClass: "border-amber-200/60 bg-amber-50/40",
      iconClass: "text-amber-600",
    };
  }
  return {
    Icon: Swords,
    badgeClass: "bg-orange-100 text-orange-800",
    cardClass: "border-orange-200/60 bg-orange-50/40",
    iconClass: "text-orange-600",
  };
}

export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}
