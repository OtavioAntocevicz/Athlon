import type { AuthUser } from "@athlon/shared-types";

export function alunoPrecisaVerificarEmail(user: AuthUser | null | undefined): boolean {
  return user?.perfil === "ALUNO" && user.emailVerificado !== true;
}

export function destinoPosLogin(user: AuthUser): string {
  if (user.perfil === "ADM") {
    return adminPrecisaConfigurarMfa(user) ? "/admin/perfil" : "/admin";
  }
  if (alunoPrecisaVerificarEmail(user)) return "/verificar-email";
  return "/";
}

export function adminPrecisaConfigurarMfa(user: AuthUser | null | undefined): boolean {
  return user?.perfil === "ADM" && user.mfaHabilitado !== true;
}

/** Rotas acessíveis ao aluno antes de confirmar o e-mail. */
export const ALUNO_ROTAS_SEM_VERIFICACAO = ["/verificar-email", "/perfil", "/chamados"] as const;

export function alunoPodeAcessarSemVerificacao(pathname: string): boolean {
  return ALUNO_ROTAS_SEM_VERIFICACAO.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );
}
