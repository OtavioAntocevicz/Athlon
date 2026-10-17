import type { ToastVariant } from "@/components/ui/toast";

export async function copyTextWithToast(
  text: string,
  toast: (message: string, variant?: ToastVariant) => void,
  successMessage = "Copiado!",
) {
  try {
    await navigator.clipboard.writeText(text);
    toast(successMessage, "success");
  } catch {
    toast("Não foi possível copiar", "error");
  }
}
