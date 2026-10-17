import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export function useComprovantesFilaCount() {
  const { user } = useAuth();
  const enabled = user?.perfil === "PROFESSOR";

  const { data } = useQuery({
    queryKey: ["comprovantes", "fila", "count"],
    queryFn: async () => {
      const fila = await api<unknown[]>("/comprovantes/fila");
      return fila.length;
    },
    enabled,
    staleTime: 60_000,
  });

  return enabled ? data ?? 0 : 0;
}
