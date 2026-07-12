import { cn } from "@/lib/cn";
import type { StatusMensalidade } from "@athlon/shared-types";

const config: Record<
  StatusMensalidade,
  { label: string; className: string; dot: string }
> = {
  PENDENTE: {
    label: "Pendente",
    className: "bg-muted text-primary ring-1 ring-primary/10",
    dot: "bg-accent-strong",
  },
  EM_ANALISE: {
    label: "Em análise",
    className: "bg-accent/15 text-accent-strong ring-1 ring-accent/30",
    dot: "bg-accent",
  },
  PAGO: {
    label: "Pago",
    className: "bg-success/10 text-success ring-1 ring-success/20",
    dot: "bg-success",
  },
  RECUSADO: {
    label: "Recusado",
    className: "bg-destructive/10 text-destructive ring-1 ring-destructive/20",
    dot: "bg-destructive",
  },
  ATRASADO: {
    label: "Atrasado",
    className: "bg-destructive/10 text-destructive ring-1 ring-destructive/25",
    dot: "bg-destructive",
  },
};

export function StatusBadge({ status }: { status: StatusMensalidade }) {
  const c = config[status] ?? config.PENDENTE;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        c.className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", c.dot)} aria-hidden />
      {c.label}
    </span>
  );
}
