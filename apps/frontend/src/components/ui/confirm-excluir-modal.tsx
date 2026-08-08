import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface ConfirmExcluirModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  isPending?: boolean;
  error?: string;
  onConfirm: () => void;
}

export function ConfirmExcluirModal({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  isPending = false,
  error,
  onConfirm,
}: ConfirmExcluirModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const podeExcluir = confirmText.trim().toUpperCase() === "EXCLUIR";

  useEffect(() => {
    if (!open) {
      setConfirmText("");
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-semibold text-destructive">Ação irreversível</p>
              <div className="mt-1 text-muted-foreground">{description}</div>
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
            disabled={isPending}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          variant="destructive"
          className="w-full"
          disabled={!podeExcluir || isPending}
          onClick={onConfirm}
        >
          <Trash2 className="h-4 w-4" />
          {isPending ? "Excluindo..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
