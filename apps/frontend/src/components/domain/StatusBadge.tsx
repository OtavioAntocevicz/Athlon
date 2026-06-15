import { cn } from "@/lib/cn";
import type { StatusMensalidade } from "@athlon/shared-types";

const config: Record<StatusMensalidade, { label: string; className: string }> = {
  PENDENTE: { label: "Pendente", className: "bg-amber-100 text-amber-800" },
  EM_ANALISE: { label: "Em análise", className: "bg-yellow-100 text-yellow-800" },
  PAGO: { label: "Pago", className: "bg-blue-100 text-blue-800" },
  RECUSADO: { label: "Recusado", className: "bg-red-100 text-red-800" },
  ATRASADO: { label: "Atrasado", className: "bg-red-100 text-red-700" },
};

export function StatusBadge({ status }: { status: StatusMensalidade }) {
  const c = config[status] ?? config.PENDENTE;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", c.className)}>
      {c.label}
    </span>
  );
}
