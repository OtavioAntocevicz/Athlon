import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/AppShell";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";

interface RouteErrorFallbackProps {
  onRetry: () => void;
}

export function RouteErrorFallback({ onRetry }: RouteErrorFallbackProps) {
  const { user } = useAuth();

  const body = (
    <div className="mt-8 space-y-4 text-center">
      <p className="text-sm font-medium text-primary">Não foi possível abrir esta seção</p>
      <p className="text-xs text-muted-foreground">
        Tente novamente. Se o problema continuar, atualize o aplicativo.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => window.location.reload()}>
          Atualizar app
        </Button>
      </div>
    </div>
  );

  if (user?.perfil === "ADM") {
    return <AdminShell>{body}</AdminShell>;
  }
  if (user) {
    return <AppShell>{body}</AppShell>;
  }
  return <div className="mx-auto min-h-screen max-w-mobile bg-background px-4">{body}</div>;
}
