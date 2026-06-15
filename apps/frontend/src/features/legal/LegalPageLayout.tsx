import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageEnter } from "@/components/ui/page-enter";
import { useAuth } from "@/lib/auth-context";

interface LegalPageLayoutProps {
  title: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const backTo = user ? "/" : "/login";

  return (
    <div className="mx-auto flex min-h-screen max-w-mobile flex-col bg-background px-6 py-8">
      <PageEnter>
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Última atualização: junho de 2026</p>
      </PageEnter>

      <PageEnter delay={80} className="mt-8 space-y-6 pb-8">
        {children}
      </PageEnter>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-primary">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
