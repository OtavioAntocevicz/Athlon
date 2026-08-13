import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useAlunoBloqueado } from "@/lib/use-aluno-bloqueado";
import {
  alunoPrecisaVerificarEmail,
  alunoPodeAcessarSemVerificacao,
  destinoPosLogin,
} from "@/lib/aluno-email";
import type { ReactNode } from "react";
import { LogoFill } from "@/components/layout/LogoFill";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LogoFill />
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.perfil === "ADM") return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

/** Bloqueia aluno não verificado fora das rotas permitidas (verificação, perfil, chamados). */
export function AlunoEmailGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!alunoPrecisaVerificarEmail(user)) return <>{children}</>;
  if (alunoPodeAcessarSemVerificacao(location.pathname)) return <>{children}</>;

  return <Navigate to="/verificar-email" replace />;
}

export function AlunoVerificacaoRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login/aluno" replace />;
  if (user.perfil !== "ALUNO") return <Navigate to="/" replace />;
  if (user.emailVerificado === true) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (user) {
    const target = destinoPosLogin(user);
    return (
      <>
        <LoadingScreen />
        <Navigate to={target} replace />
      </>
    );
  }
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login/professor" replace />;
  if (user.perfil !== "ADM") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function isProfessorUser(user: { perfil?: string; professorId?: string }) {
  return user.perfil === "PROFESSOR" || !!user.professorId;
}

export function ProfessorRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.perfil === "ADM") return <Navigate to="/admin" replace />;
  if (!isProfessorUser(user)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AlunoRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.perfil !== "ALUNO") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AlunoTurmasRoute({ children }: { children: ReactNode }) {
  return (
    <AlunoRoute>
      <AlunoTurmasGuard>{children}</AlunoTurmasGuard>
    </AlunoRoute>
  );
}

function AlunoTurmasGuard({ children }: { children: ReactNode }) {
  const { bloqueado, isLoading } = useAlunoBloqueado();

  // Não bloqueia a árvore inteira: deixa a seção carregar e só redireciona
  // quando soubermos que está inadimplente.
  if (isLoading) return <>{children}</>;
  if (bloqueado) return <Navigate to="/mensalidades" replace />;
  return <>{children}</>;
}
