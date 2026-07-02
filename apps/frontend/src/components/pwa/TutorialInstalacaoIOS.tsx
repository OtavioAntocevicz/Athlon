import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, PlusSquare, Share } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const PASSOS = [
  {
    titulo: "Abra o menu Compartilhar",
    descricao:
      "Na barra inferior do Safari, toque no ícone Compartilhar (quadrado com seta para cima).",
    Icon: Share,
  },
  {
    titulo: "Adicionar à Tela de Início",
    descricao: 'Role o menu e toque em "Adicionar à Tela de Início".',
    Icon: PlusSquare,
  },
  {
    titulo: "Confirme a instalação",
    descricao: 'Toque em "Adicionar" no canto superior direito para concluir.',
    Icon: Check,
  },
] as const;

interface TutorialInstalacaoIOSProps {
  open: boolean;
  onClose: () => void;
  onDismiss: () => void;
}

export function TutorialInstalacaoIOS({ open, onClose, onDismiss }: TutorialInstalacaoIOSProps) {
  const [passo, setPasso] = useState(0);
  const atual = PASSOS[passo];
  const Icon = atual.Icon;
  const ultimo = passo === PASSOS.length - 1;

  const handleClose = () => {
    setPasso(0);
    onClose();
  };

  const handleDismiss = () => {
    setPasso(0);
    onDismiss();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Instalar o ATHLON">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Instale o app na tela inicial para acesso mais rápido e melhor experiência offline.
        </p>

        <div className="flex flex-col items-center rounded-xl border bg-muted/30 px-4 py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-8 w-8" strokeWidth={1.75} />
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Passo {passo + 1} de {PASSOS.length}
          </p>
          <h3 className="mt-1 text-base font-semibold text-primary">{atual.titulo}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{atual.descricao}</p>
        </div>

        <div className="flex justify-center gap-1.5">
          {PASSOS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === passo ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {passo > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setPasso((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
          ) : (
            <Button type="button" variant="outline" className="flex-1" onClick={handleDismiss}>
              Agora não
            </Button>
          )}

          {ultimo ? (
            <Button type="button" className="flex-1" onClick={handleClose}>
              Entendi
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1"
              onClick={() => setPasso((p) => p + 1)}
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
