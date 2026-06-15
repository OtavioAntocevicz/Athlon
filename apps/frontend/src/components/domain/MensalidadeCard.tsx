import { Paperclip, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, formatMes, getInitials } from "@/lib/format";
import type { StatusMensalidade } from "@athlon/shared-types";
import { cn } from "@/lib/cn";

const barColors: Record<StatusMensalidade, string> = {
  PENDENTE: "bg-amber-400",
  EM_ANALISE: "bg-yellow-400",
  PAGO: "bg-blue-500",
  RECUSADO: "bg-red-400",
  ATRASADO: "bg-red-600",
};

interface MensalidadeCardProps {
  alunoNome: string;
  turmaNome?: string;
  mesReferencia: string;
  valorCentavos: number;
  status: StatusMensalidade;
  comprovanteEmAnalise?: boolean;
  comprovantePreviewUrl?: string | null;
  onClick?: () => void;
}

export function MensalidadeCard({
  alunoNome,
  turmaNome,
  mesReferencia,
  valorCentavos,
  status,
  comprovanteEmAnalise,
  comprovantePreviewUrl,
  onClick,
}: MensalidadeCardProps) {
  const isPdf = comprovantePreviewUrl?.includes(".pdf") || comprovantePreviewUrl?.includes("pdf?");
  return (
    <Card
      className={cn("relative overflow-hidden pl-5", onClick && "cursor-pointer active:scale-[0.99] transition-transform")}
      onClick={onClick}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", barColors[status])} />
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-primary">
          {getInitials(alunoNome)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-primary">{alunoNome}</p>
              <p className="text-xs text-muted-foreground">{formatMes(mesReferencia)}</p>
              {turmaNome && <p className="text-xs text-muted-foreground">{turmaNome}</p>}
            </div>
            <StatusBadge status={status} />
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="rounded-lg bg-muted/50 px-3 py-2 flex-1">
              <p className="text-xs text-muted-foreground">Valor Total</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(valorCentavos)}</p>
            </div>
            {comprovanteEmAnalise && (
              <div className="flex flex-col items-center gap-1">
                {comprovantePreviewUrl && !isPdf ? (
                  <img
                    src={comprovantePreviewUrl}
                    alt="Comprovante"
                    className="h-12 w-12 rounded-lg border object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
                    {isPdf ? (
                      <FileText className="h-5 w-5 text-primary" />
                    ) : (
                      <Paperclip className="h-5 w-5 text-primary" />
                    )}
                  </div>
                )}
                <span className="text-[10px] font-medium text-amber-700">Em análise</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
