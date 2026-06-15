import { cn } from "@/lib/cn";
import type { StatusMensalidade } from "@athlon/shared-types";

function dotClass(status: StatusMensalidade): string {
  if (status === "PAGO") return "bg-green-500";
  if (status === "ATRASADO") return "bg-red-500";
  return "bg-amber-400";
}

export function StatusDot({ status }: { status: StatusMensalidade }) {
  return (
    <span
      className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClass(status))}
      title={status}
    />
  );
}
