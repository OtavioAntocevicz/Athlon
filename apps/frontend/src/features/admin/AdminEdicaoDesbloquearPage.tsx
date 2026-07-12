import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Unlock } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import type { AdminBloqueioItem } from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageEnter } from "@/components/ui/page-enter";
import { getInitials } from "@/lib/format";

export function AdminEdicaoDesbloquearPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [erro, setErro] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "bloqueios"],
    queryFn: () => api<AdminBloqueioItem[]>("/admin/bloqueios"),
  });

  const mutation = useMutation({
    mutationFn: (item: AdminBloqueioItem) =>
      api(`/admin/alunos/${item.alunoId}/desbloquear`, {
        method: "POST",
        body: JSON.stringify({ turmaId: item.turmaId }),
      }),
    onSuccess: (_d, item) => {
      setErro("");
      setOkMsg(`${item.alunoNome} desbloqueado em ${item.turmaNome}.`);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => {
      setOkMsg("");
      setErro(getErrorMessage(e, "Erro ao desbloquear"));
    },
  });

  const lista = data ?? [];

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <button
          type="button"
          onClick={() => navigate("/admin/edicao")}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageHeader
          title="Desbloquear inadimplência"
          subtitle="Alunos bloqueados nas turmas"
        />

        {isLoading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {!isLoading && lista.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhum aluno bloqueado no momento.
          </Card>
        )}

        <div className="space-y-2.5">
          {lista.map((item) => (
            <Card key={`${item.alunoId}-${item.turmaId}`} className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                  {getInitials(item.alunoNome)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-primary">{item.alunoNome}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.turmaNome} · {item.professorNome}
                  </p>
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={mutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Desbloquear ${item.alunoNome} na turma "${item.turmaNome}"?`,
                        )
                      ) {
                        mutation.mutate(item);
                      }
                    }}
                  >
                    <Unlock className="h-4 w-4" /> Desbloquear
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}
        {okMsg && <p className="mt-3 text-sm text-success">{okMsg}</p>}
      </PageEnter>
    </AdminShell>
  );
}
