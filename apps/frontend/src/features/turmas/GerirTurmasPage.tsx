import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Trash2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface TurmaItem {
  id: string;
  nome: string;
  modalidade: string;
  totalAlunos: number;
  mensalidadeCentavos: number;
}

export function GerirTurmasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selecionada, setSelecionada] = useState<TurmaItem | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [erro, setErro] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["turmas"],
    queryFn: () => api<TurmaItem[]>("/turmas"),
  });

  const excluirMutation = useMutation({
    mutationFn: (id: string) => api(`/turmas/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSelecionada(null);
      setConfirmText("");
      setErro("");
    },
    onError: (e: Error) => setErro(e.message),
  });

  const podeExcluir = confirmText.trim().toUpperCase() === "EXCLUIR";

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao perfil
      </button>

      <PageHeader
        title="Gerir turmas"
        subtitle="Visualize e exclua turmas permanentemente"
      />

      <div className="space-y-3">
        {isLoading &&
          [1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}

        {!isLoading && data?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma turma cadastrada
          </p>
        )}

        {data?.map((turma) => (
          <Card
            key={turma.id}
            className="cursor-pointer active:scale-[0.99]"
            onClick={() => {
              setErro("");
              setConfirmText("");
              setSelecionada(turma);
            }}
          >
            <p className="font-bold text-primary">{turma.nome}</p>
            <p className="text-xs text-muted-foreground">{turma.modalidade}</p>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {turma.totalAlunos} alunos
              </span>
              <span>{formatCurrency(turma.mensalidadeCentavos)}/mês</span>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!selecionada}
        onClose={() => {
          setSelecionada(null);
          setConfirmText("");
          setErro("");
        }}
        title={selecionada?.nome ?? "Turma"}
      >
        {selecionada && (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
                <div className="text-sm">
                  <p className="font-semibold text-destructive">Ação irreversível</p>
                  <p className="mt-1 text-muted-foreground">
                    Excluir a turma <strong>{selecionada.nome}</strong> remove
                    permanentemente matrículas, mensalidades e comprovantes
                    vinculados. Os alunos não são excluídos do sistema.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">
                Digite <strong>EXCLUIR</strong> para confirmar
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="EXCLUIR"
                autoComplete="off"
              />
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <Button
              variant="destructive"
              className="w-full"
              disabled={!podeExcluir || excluirMutation.isPending}
              onClick={() => excluirMutation.mutate(selecionada.id)}
            >
              <Trash2 className="h-4 w-4" />
              {excluirMutation.isPending ? "Excluindo..." : "Excluir turma permanentemente"}
            </Button>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
