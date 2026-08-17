import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuditoriaAdminLista } from "@athlon/shared-types";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { AdminShell } from "@/components/layout/AdminShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageEnter } from "@/components/ui/page-enter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/domain/FilterPills";
import { ScrollText } from "lucide-react";

const ACAO_LABEL: Record<string, string> = {
  criar_professor: "Criar professor",
  atualizar_status_professor: "Ativar/desativar professor",
  reenviar_convite_professor: "Reenviar convite",
  excluir_professor: "Excluir professor",
  excluir_aluno: "Excluir aluno",
  matricular_aluno: "Matricular aluno",
  afastar_aluno: "Remover da turma",
  trocar_turma: "Trocar turma",
  desbloquear_aluno: "Desbloquear inadimplência",
  responder_chamado: "Responder chamado",
  mfa_habilitar: "MFA habilitado",
  mfa_desabilitar: "MFA desabilitado",
};

const filtros = [
  { value: "", label: "Todas" },
  ...Object.entries(ACAO_LABEL).map(([value, label]) => ({ value, label })),
];

export function AdminAuditoriaPage() {
  const [acao, setAcao] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "auditoria", acao, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (acao) params.set("acao", acao);
      return api<AuditoriaAdminLista>(`/admin/auditoria?${params}`);
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <PageHeader
          title="Auditoria"
          subtitle="Registro de ações administrativas"
        />

        <FilterPills
          options={filtros}
          value={acao}
          onChange={(v) => {
            setAcao(v);
            setPage(1);
          }}
        />

        <div className="mt-4 space-y-2.5">
          {isLoading &&
            [1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}

          {!isLoading && (data?.items.length ?? 0) === 0 && (
            <Card className="flex flex-col items-center gap-2 p-8 text-center">
              <ScrollText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
            </Card>
          )}

          {data?.items.map((item) => (
            <Card key={item.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-primary">
                    {ACAO_LABEL[item.acao] ?? item.acao}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.adminNome} · {formatDateTime(item.criadoEm)}
                  </p>
                  {(item.entidade || item.entidadeId) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.entidade}
                      {item.entidadeId ? ` · ${item.entidadeId.slice(0, 8)}…` : ""}
                    </p>
                  )}
                  {item.detalhes && Object.keys(item.detalhes).length > 0 && (
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {JSON.stringify(item.detalhes)}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {data && data.total > data.limit && (
          <div className="mt-6 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </PageEnter>
    </AdminShell>
  );
}
