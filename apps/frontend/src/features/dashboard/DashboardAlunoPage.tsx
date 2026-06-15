import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useAlunoBloqueado } from "@/lib/use-aluno-bloqueado";
import { formatCurrency, formatDate, formatMes } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Button } from "@/components/ui/button";
import type { StatusMensalidade } from "@athlon/shared-types";
import { PageEnter } from "@/components/ui/page-enter";

interface DashboardAluno {
  situacaoFinanceira: {
    pagamentoId: string | null;
    mesReferencia: string | null;
    turmaNome: string | null;
    status: StatusMensalidade;
    valorCentavos: number;
    vencimento: string | null;
    chavePix: string | null;
    totalAtrasadas: number;
    totalEmAberto: number;
  };
  turmas: {
    id: string;
    nome: string;
    modalidade: string;
    horarioInicio: string | null;
    local: string | null;
  }[];
  bloqueiosInadimplencia: { turmaId: string; turmaNome: string }[];
}

const STATUS_MSG: Partial<Record<StatusMensalidade, string>> = {
  PENDENTE: "Aguardando pagamento até o vencimento.",
  ATRASADO: "Pagamento em atraso. Regularize o quanto antes.",
  EM_ANALISE: "Comprovante enviado - aguardando aprovação do treinador.",
  RECUSADO: "Comprovante recusado. Envie um novo comprovante.",
  PAGO: "Mensalidade quitada neste período.",
};

export function DashboardAlunoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { bloqueado } = useAlunoBloqueado();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "aluno"],
    queryFn: () => api<DashboardAluno>("/dashboard/aluno"),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" />
      </AppShell>
    );
  }

  const fin = data!.situacaoFinanceira;
  const precisaPagar = fin.status !== "PAGO" && fin.status !== "EM_ANALISE";

  const copyPix = () => {
    if (fin.chavePix) {
      navigator.clipboard.writeText(fin.chavePix);
    }
  };

  return (
    <AppShell>
      <PageEnter variant="fade">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-primary">
          Olá, {user?.nome?.split(" ")[0]}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">Sua situação hoje</p>
      </div>

      {bloqueado && (
        <Card className="mt-4 border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">Conta bloqueada por inadimplência</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu acesso está limitado. Você pode apenas visualizar e pagar suas mensalidades em
            atraso. Após regularizar, solicite o desbloqueio ao professor.
          </p>
          <Button className="mt-3 w-full" onClick={() => navigate("/mensalidades")}>
            Ir para mensalidades
          </Button>
        </Card>
      )}

      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold text-primary">Situação financeira</p>
          <StatusBadge status={fin.status} />
        </div>

        {fin.mesReferencia && (
          <p className="text-sm font-medium text-primary">
            {formatMes(fin.mesReferencia)}
            {fin.turmaNome ? ` · ${fin.turmaNome}` : ""}
          </p>
        )}

        <p className="mt-2 text-2xl font-bold">{formatCurrency(fin.valorCentavos)}</p>

        {fin.vencimento && precisaPagar && (
          <p className="mt-1 text-sm text-muted-foreground">
            Vencimento: {formatDate(fin.vencimento)}
          </p>
        )}

        {STATUS_MSG[fin.status] && (
          <p className="mt-2 text-sm text-muted-foreground">{STATUS_MSG[fin.status]}</p>
        )}

        {fin.totalAtrasadas > 0 && (
          <p className="mt-2 text-sm font-medium text-destructive">
            {fin.totalAtrasadas === 1
              ? "1 mensalidade em atraso"
              : `${fin.totalAtrasadas} mensalidades em atraso`}
            {fin.totalEmAberto > fin.totalAtrasadas &&
              ` · ${fin.totalEmAberto - fin.totalAtrasadas} pendente(s) no prazo`}
          </p>
        )}

        {fin.chavePix && precisaPagar && (
          <Button variant="secondary" className="mt-4 w-full" onClick={copyPix}>
            Copiar PIX
          </Button>
        )}

        <Button
          variant="outline"
          className="mt-2 w-full"
          onClick={() => navigate("/mensalidades")}
        >
          Ver mensalidades
        </Button>
      </Card>

      {!bloqueado && data!.turmas.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-bold text-primary">Minhas Turmas</h2>
          <div className="space-y-3">
            {data!.turmas.map((t) => (
              <Card
                key={t.id}
                className="cursor-pointer active:scale-[0.99]"
                onClick={() => navigate(`/minhas-turmas/${t.id}`)}
              >
                <p className="font-semibold text-primary">{t.nome}</p>
                <p className="text-xs text-muted-foreground">{t.modalidade}</p>
                {t.horarioInicio && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.horarioInicio} - {t.local}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
      </PageEnter>
    </AppShell>
  );
}
