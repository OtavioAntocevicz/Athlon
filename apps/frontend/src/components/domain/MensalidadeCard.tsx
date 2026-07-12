import { Paperclip, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, formatMes, getInitials } from "@/lib/format";
import type { StatusMensalidade } from "@athlon/shared-types";
import { cn } from "@/lib/cn";

const barColors: Record<StatusMensalidade, string> = {
  PENDENTE: "bg-accent",
  EM_ANALISE: "bg-accent-strong",
  PAGO: "bg-success",
  RECUSADO: "bg-destructive",
  ATRASADO: "bg-destructive",
};

interface MensalidadeCardProps {
  alunoNome: string;
  turmaNome?: string;
  mesReferencia: string;
  valorCentavos: number;
  status: StatusMensalidade;
  comprovanteEmAnalise?: boolean;
  comprovantePreviewUrl?: string | null;
  /** Quando true, destaca mês/turma em vez do nome do aluno */
  visaoAluno?: boolean;
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
  visaoAluno = false,
  onClick,
}: MensalidadeCardProps) {
  const isPdf = comprovantePreviewUrl?.includes(".pdf") || comprovantePreviewUrl?.includes("pdf?");
  const titulo = visaoAluno ? formatMes(mesReferencia) : alunoNome;
  const subtitulo = visaoAluno
    ? turmaNome ?? ""
    : `${formatMes(mesReferencia)}${turmaNome ? ` · ${turmaNome}` : ""}`;
  const iniciais = getInitials(visaoAluno ? turmaNome || alunoNome : alunoNome);

  return (
    <Card
      className={cn(
        "relative overflow-hidden pl-5",
        onClick && "cursor-pointer transition-transform active:scale-[0.99]",
      )}
      onClick={onClick}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", barColors[status])} />
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-white">
          {iniciais}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-primary">{titulo}</p>
              {subtitulo && (
                <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>
              )}
            </div>
            <StatusBadge status={status} />
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="flex-1 rounded-lg bg-muted/60 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Valor</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(valorCentavos)}</p>
            </div>
            {comprovanteEmAnalise && (
              <div className="flex flex-col items-center gap-1">
                {comprovantePreviewUrl && !isPdf ? (
                  <img
                    src={comprovantePreviewUrl}
                    alt="Comprovante"
                    className="h-12 w-12 rounded-lg border border-primary/10 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/10 bg-muted">
                    {isPdf ? (
                      <FileText className="h-5 w-5 text-primary" />
                    ) : (
                      <Paperclip className="h-5 w-5 text-primary" />
                    )}
                  </div>
                )}
                <span className="text-[10px] font-semibold text-accent-strong">Em análise</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
