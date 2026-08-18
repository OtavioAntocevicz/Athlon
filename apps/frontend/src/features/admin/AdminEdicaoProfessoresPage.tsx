import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import type { AdminProfessorResumo } from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageEnter } from "@/components/ui/page-enter";
import { ConfirmExcluirModal } from "@/components/ui/confirm-excluir-modal";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AdminEdicaoProfessoresPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [excluirAlvo, setExcluirAlvo] = useState<AdminProfessorResumo | null>(null);
  const [erroExcluir, setErroExcluir] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "professores", busca],
    queryFn: () => {
      const qs = busca.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : "";
      return api<AdminProfessorResumo[]>(`/admin/professores${qs}`);
    },
  });

  const mutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      api(`/admin/professores/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ ativo }),
      }),
    onSuccess: () => {
      setErro("");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => setErro(getErrorMessage(e, "Erro ao atualizar status")),
  });

  const excluirMutation = useMutation({
    mutationFn: (id: string) => api(`/admin/professores/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setExcluirAlvo(null);
      setErroExcluir("");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => setErroExcluir(getErrorMessage(e, "Erro ao excluir professor")),
  });

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
          title="Professores"
          subtitle="Ativar, desativar ou excluir a conta do treinador"
        />

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Buscar professor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        <div className="space-y-2.5">
          {(data ?? []).map((p) => (
            <Card key={p.id} className="flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {getInitials(p.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-primary">{p.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                <span
                  className={cn(
                    "mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1",
                    p.ativo
                      ? "bg-success/10 text-success ring-success/20"
                      : "bg-destructive/10 text-destructive ring-destructive/20",
                  )}
                >
                  {p.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => {
                    const next = !p.ativo;
                    const msg = next
                      ? `Reativar ${p.nome}?`
                      : `Desativar ${p.nome}? Ele não poderá mais entrar no app.`;
                    if (!window.confirm(msg)) return;
                    mutation.mutate({ id: p.id, ativo: next });
                  }}
                >
                  {p.ativo ? "Desativar" : "Reativar"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setErroExcluir("");
                    setExcluirAlvo(p);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}
      </PageEnter>

      <ConfirmExcluirModal
        open={!!excluirAlvo}
        onClose={() => {
          if (excluirMutation.isPending) return;
          setExcluirAlvo(null);
          setErroExcluir("");
        }}
        title="Excluir professor"
        description={
          excluirAlvo ? (
            <>
              <p>
                Excluir <strong>{excluirAlvo.nome}</strong> remove permanentemente a conta
                de login e todas as turmas deste professor.
              </p>
              <p className="mt-1">
                Os alunos <strong>não</strong> são excluídos do sistema — apenas saem
                dessas turmas.
              </p>
            </>
          ) : null
        }
        confirmLabel="Excluir professor permanentemente"
        isPending={excluirMutation.isPending}
        error={erroExcluir}
        onConfirm={() => {
          if (excluirAlvo) excluirMutation.mutate(excluirAlvo.id);
        }}
      />
    </AdminShell>
  );
}
