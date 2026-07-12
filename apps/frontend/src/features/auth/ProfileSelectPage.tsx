import { useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, ClipboardList, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageEnter } from "@/components/ui/page-enter";

type ProfileOptionProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  variant: "professor" | "aluno";
  onClick: () => void;
};

function ProfileOption({ title, subtitle, icon: Icon, variant, onClick }: ProfileOptionProps) {
  const isProfessor = variant === "professor";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div
        className={`relative overflow-hidden rounded-xl border bg-card p-3 shadow-brand-card transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-brand-card-hover group-active:scale-[0.99] ${
          isProfessor
            ? "border-primary/15 group-hover:border-accent/60"
            : "border-primary/10 group-hover:border-primary/25"
        }`}
      >
        <div
          className={`absolute inset-y-0 left-0 w-1.5 ${
            isProfessor ? "bg-accent" : "bg-primary"
          }`}
        />

        <div className="flex items-center gap-3 pl-1.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isProfessor ? "bg-accent text-white" : "bg-primary text-white"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={2.25} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-base font-bold text-primary">{title}</p>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>
    </button>
  );
}

export function ProfileSelectPage() {
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 bottom-0 mx-auto flex max-w-mobile flex-col overflow-hidden bg-background px-6 pb-2 pt-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-25deg, #E8B84A 0px, #E8B84A 2px, transparent 2px, transparent 22px)",
          maskImage: "linear-gradient(to bottom, black, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-12 overflow-hidden">
        <PageEnter variant="fade">
          <header className="relative shrink-0 text-center">
            <p className="text-2xl font-bold leading-tight text-primary">ATHLON</p>
            <p className="mt-0.5 text-xs font-medium text-accent-strong">
              Gestão esportiva para treinadores e atletas
            </p>
          </header>
        </PageEnter>

        <PageEnter variant="fade" delay={60} className="flex shrink-0 justify-center">
          <div className="relative flex w-full max-w-[380px] items-center justify-center">
            <div
              aria-hidden
              className="absolute h-[85%] w-[85%] rounded-full bg-accent/25 blur-3xl"
            />
            <img
              src="/logo.png"
              alt="Athlon"
              className="relative h-auto max-h-[280px] w-full object-contain drop-shadow-[0_16px_28px_rgba(92,61,46,0.26)]"
              draggable={false}
            />
          </div>
        </PageEnter>

        <div className="shrink-0 space-y-2">
          <PageEnter variant="fade" delay={100} className="text-center">
            <h1 className="text-base font-bold text-primary">Como você deseja entrar?</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Selecione seu perfil para continuar</p>
          </PageEnter>

          <div className="space-y-2">
            <PageEnter variant="fade" delay={150}>
              <ProfileOption
                variant="professor"
                icon={ClipboardList}
                title="Sou Treinador"
                subtitle="Crie turmas, acompanhe mensalidades e valide comprovantes dos alunos."
                onClick={() => navigate("/login/professor")}
              />
            </PageEnter>
            <PageEnter variant="fade" delay={150}>
              <ProfileOption
                variant="aluno"
                icon={User}
                title="Sou Aluno"
                subtitle="Veja suas turmas, pague mensalidades e envie comprovantes pelo celular."
                onClick={() => navigate("/login/aluno")}
              />
            </PageEnter>
          </div>
        </div>
      </div>

      <div className="shrink-0 pt-1 text-center safe-bottom">
        <p className="text-[11px] leading-snug text-muted-foreground">
          Ao entrar, você concorda com nossos{" "}
          <Link
            to="/termos"
            className="font-medium text-primary underline decoration-primary/30"
          >
            Termos de Uso
          </Link>{" "}
          e{" "}
          <Link
            to="/privacidade"
            className="font-medium text-primary underline decoration-primary/30"
          >
            Privacidade
          </Link>
        </p>
      </div>
    </div>
  );
}
