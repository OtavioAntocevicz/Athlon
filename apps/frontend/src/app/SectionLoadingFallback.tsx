import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/AppShell";
import { AdminShell } from "@/components/layout/AdminShell";
import { LoadingScreen } from "./guards";

function ContentSpinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

/** Mantém header/nav visíveis enquanto o chunk da seção carrega. */
export function SectionLoadingFallback() {
  const { user, isLoading } = useAuth();

  if (isLoading && !user) return null;

  if (user?.perfil === "ADM") {
    return (
      <AdminShell>
        <ContentSpinner />
      </AdminShell>
    );
  }

  if (user) {
    return (
      <AppShell>
        <ContentSpinner />
      </AppShell>
    );
  }

  return <LoadingScreen />;
}
