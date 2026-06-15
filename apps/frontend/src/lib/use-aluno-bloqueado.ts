import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./auth-context";

interface BloqueioInfo {
  bloqueado: boolean;
  bloqueios: { turmaId: string; turmaNome: string }[];
}

export function useAlunoBloqueado() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["aluno", "bloqueio"],
    queryFn: () => api<BloqueioInfo>("/alunos/me/bloqueio"),
    enabled: user?.perfil === "ALUNO",
    staleTime: 30_000,
  });

  return {
    bloqueado: data?.bloqueado ?? false,
    bloqueios: data?.bloqueios ?? [],
    isLoading,
  };
}
