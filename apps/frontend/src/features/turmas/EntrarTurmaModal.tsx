import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface TurmaPreview {
  id: string;
  nome: string;
  modalidade: string;
  nivel: string;
  local: string | null;
  horarioInicio: string | null;
  horarioFim: string | null;
  mensalidadeCentavos: number;
  diaVencimento: number;
  codigoConvite: string;
  jaMatriculado: boolean;
}

interface EntrarTurmaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EntrarTurmaModal({ open, onClose, onSuccess }: EntrarTurmaModalProps) {
  const [codigo, setCodigo] = useState("");
  const [preview, setPreview] = useState<TurmaPreview | null>(null);
  const [erro, setErro] = useState("");

  const buscarMutation = useMutation({
    mutationFn: () =>
      api<TurmaPreview>("/alunos/preview-turma", {
        method: "POST",
        body: JSON.stringify({ codigoConvite: codigo.trim() }),
      }),
    onSuccess: (data) => {
      setErro("");
      setPreview(data);
    },
    onError: (e: Error) => {
      setPreview(null);
      setErro(e.message);
    },
  });

  const entrarMutation = useMutation({
    mutationFn: () =>
      api("/alunos/entrar-turma", {
        method: "POST",
        body: JSON.stringify({ codigoConvite: codigo.trim() }),
      }),
    onSuccess: () => {
      setCodigo("");
      setPreview(null);
      onSuccess();
      onClose();
    },
    onError: (e: Error) => setErro(e.message),
  });

  const handleClose = () => {
    setCodigo("");
    setPreview(null);
    setErro("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Entrar em uma turma">
      {!preview ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Código da turma</label>
            <Input
              placeholder="Digite o código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button
            className="w-full"
            disabled={codigo.trim().length < 4 || buscarMutation.isPending}
            onClick={() => buscarMutation.mutate()}
          >
            {buscarMutation.isPending ? "Buscando..." : "Verificar turma"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="space-y-2 p-4">
            <p className="text-lg font-bold text-primary">{preview.nome}</p>
            <p className="text-sm text-muted-foreground">
              {preview.modalidade} · {preview.nivel}
            </p>
            {preview.local && (
              <p className="text-sm text-muted-foreground">Local: {preview.local}</p>
            )}
            {preview.horarioInicio && (
              <p className="text-sm text-muted-foreground">
                Horário: {preview.horarioInicio}
                {preview.horarioFim ? ` - ${preview.horarioFim}` : ""}
              </p>
            )}
            <p className="text-sm font-medium">
              {formatCurrency(preview.mensalidadeCentavos)}/mês · venc. dia{" "}
              {preview.diaVencimento}
            </p>
          </Card>

          {preview.jaMatriculado ? (
            <p className="text-sm text-destructive">Você já está matriculado nesta turma.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Confirme os dados acima antes de entrar na turma.
            </p>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPreview(null)}>
              Voltar
            </Button>
            <Button
              className="flex-1"
              disabled={preview.jaMatriculado || entrarMutation.isPending}
              onClick={() => entrarMutation.mutate()}
            >
              {entrarMutation.isPending ? "Entrando..." : "Confirmar entrada"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
