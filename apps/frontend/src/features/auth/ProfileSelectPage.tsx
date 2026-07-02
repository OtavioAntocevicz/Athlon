import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, GraduationCap, User } from "lucide-react";
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
        className={`relative overflow-hidden rounded-xl border bg-card p-3 shadow-md transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-active:scale-[0.99] ${
          isProfessor
            ? "border-primary/15 group-hover:border-accent/60"
            : "border-primary/10 group-hover:border-primary/25"
        }`}
      >
        <div
          className={`absolute inset-y-0 left-0 w-1.5 ${
            isProfessor ? "bg-accent" : "bg-primary/30 group-hover:bg-primary/50"
          }`}
        />

        <div className="flex items-center gap-3 pl-1.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isProfessor ? "bg-primary text-accent" : "bg-muted text-primary"
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

  return (
    <div className="mx-auto grid h-dvh max-h-dvh max-w-mobile grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-background px-6 py-3">
      <PageEnter>
        <header className="grid shrink-0 place-items-center text-center">
          <p className="text-2xl font-bold leading-tight text-primary">ATHLON</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Gestão esportiva para treinadores e atletas
          </p>
        </header>
      </PageEnter>

      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain">
        <PageEnter delay={80} className="flex min-h-0 flex-1 items-center justify-center">
          <img
            src="/logo.png"
            alt=""
            className="mx-auto h-full max-h-full w-full max-w-[500px] object-contain"
            draggable={false}
          />
        </PageEnter>

        <div className="shrink-0 space-y-2">
          <PageEnter delay={160} className="text-center">
            <h1 className="text-base font-bold text-primary">Como você deseja entrar?</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Selecione seu perfil para continuar</p>
          </PageEnter>

          <div className="space-y-2">
            <PageEnter delay={240}>
              <ProfileOption
                variant="professor"
                icon={GraduationCap}
                title="Sou Treinador"
                subtitle="Crie turmas, acompanhe mensalidades e valide comprovantes dos alunos."
                onClick={() => navigate("/login/professor")}
              />
            </PageEnter>
            <PageEnter delay={320}>
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

      <PageEnter delay={400} className="shrink-0 pt-2 text-center safe-bottom">
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
        <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
          V1.7.9
        </p>
      </PageEnter>
    </div>
  );
}
