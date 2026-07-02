import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface AbrirNoSafariModalProps {
  open: boolean;
  onClose: () => void;
  onDismiss: () => void;
}

export function AbrirNoSafariModal({ open, onClose, onDismiss }: AbrirNoSafariModalProps) {
  const [copiado, setCopiado] = useState(false);

  const handleClose = () => {
    setCopiado(false);
    onClose();
  };

  const handleDismiss = () => {
    setCopiado(false);
    onDismiss();
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback silencioso
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Abra no Safari">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          No iPhone, a instalação do app só funciona pelo <strong className="text-primary">Safari</strong>.
          O Chrome e outros navegadores não permitem adicionar à tela inicial da mesma forma.
        </p>

        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-primary">No Chrome ou outro navegador:</p>
          <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
            <li>
              Toque no menu <strong className="text-foreground">⋯</strong> (três pontos) no canto
              inferior direito
            </li>
            <li>
              Selecione <strong className="text-foreground">Abrir no Safari</strong> ou{" "}
              <strong className="text-foreground">Abrir no navegador externo</strong>
            </li>
            <li>No Safari, use o banner &quot;Como instalar&quot; para adicionar à tela inicial</li>
          </ol>
        </div>

        <div className="rounded-xl border border-dashed p-4">
          <p className="text-sm text-muted-foreground">
            Se não aparecer a opção acima, copie o link e cole na barra de endereço do Safari:
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={copiarLink}>
            {copiado ? (
              <>
                <Check className="h-4 w-4" /> Link copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiar link desta página
              </>
            )}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={handleDismiss}>
            Agora não
          </Button>
          <Button type="button" className="flex-1" onClick={handleClose}>
            <ExternalLink className="h-4 w-4" /> Entendi
          </Button>
        </div>
      </div>
    </Modal>
  );
}
