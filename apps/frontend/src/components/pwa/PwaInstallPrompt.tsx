import { Download, Smartphone, X } from "lucide-react";
import { usePwaInstall } from "@/lib/use-pwa-install";
import { Button } from "@/components/ui/button";
import { TutorialInstalacaoIOS } from "./TutorialInstalacaoIOS";

export function PwaInstallPrompt() {
  const {
    jaInstalado,
    mostrarConviteIOS,
    mostrarConviteAndroid,
    tutorialAberto,
    instalarAndroid,
    abrirTutorialIOS,
    fecharTutorialIOS,
    dispensarTutorialIOS,
  } = usePwaInstall();

  if (jaInstalado) return null;

  const mostrarBanner = mostrarConviteAndroid || mostrarConviteIOS;

  return (
    <>
      {mostrarBanner && (
        <div className="fixed bottom-[4.5rem] left-0 right-0 z-40 mx-auto max-w-mobile px-4 lg:bottom-6 lg:max-w-5xl">
          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-card p-3 shadow-lg">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {mostrarConviteAndroid ? (
                <Download className="h-5 w-5" />
              ) : (
                <Smartphone className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary">Instale o ATHLON</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Acesso rápido na tela inicial e melhor experiência offline.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {mostrarConviteAndroid ? (
                  <Button type="button" size="sm" onClick={() => instalarAndroid()}>
                    Instalar app
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={abrirTutorialIOS}>
                    Como instalar
                  </Button>
                )}
                {mostrarConviteIOS && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-muted-foreground"
                    onClick={dispensarTutorialIOS}
                  >
                    Agora não
                  </Button>
                )}
              </div>
            </div>
            {mostrarConviteIOS && (
              <button
                type="button"
                onClick={dispensarTutorialIOS}
                className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <TutorialInstalacaoIOS
        open={tutorialAberto}
        onClose={fecharTutorialIOS}
        onDismiss={dispensarTutorialIOS}
      />
    </>
  );
}
