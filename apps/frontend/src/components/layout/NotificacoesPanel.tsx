import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";
import { registrarPushNotifications } from "@/lib/push-notifications";
import { track } from "@/lib/analytics/analytics";

interface Notificacao {
  id: string;
  titulo: string;
  corpo: string | null;
  tipo: string | null;
  url: string | null;
  lida: boolean;
  criadoEm: string;
}

export function NotificacoesPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ultimaContagem = useRef(0);

  const { data: contagem } = useQuery({
    queryKey: ["notificacoes", "contagem"],
    queryFn: () => api<{ total: number }>("/notificacoes/contagem"),
    enabled: user?.perfil === "ALUNO",
    // Economia free tier: menos hits enquanto o app fica aberto
    refetchInterval: 180_000,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  const { data: notificacoes } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: () => api<Notificacao[]>("/notificacoes"),
    enabled: user?.perfil === "ALUNO" && aberto,
    staleTime: 30_000,
  });

  const marcarLida = useMutation({
    mutationFn: (id: string) =>
      api(`/notificacoes/${id}/lida`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    },
  });

  useEffect(() => {
    if (user?.perfil === "ALUNO") {
      registrarPushNotifications().catch(() => {
        /* permissão negada ou push indisponível */
      });
    }
  }, [user?.perfil]);

  useEffect(() => {
    const total = contagem?.total ?? 0;
    if (total > ultimaContagem.current && ultimaContagem.current > 0) {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("ATHLON", {
          body: "Você tem novas notificações",
          icon: "/icon-192.png",
        });
      }
    }
    ultimaContagem.current = total;
  }, [contagem?.total]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    if (aberto) document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [aberto]);

  if (user?.perfil !== "ALUNO") return null;

  const total = contagem?.total ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="relative rounded-full p-2 hover:bg-muted"
        onClick={() => setAberto((v) => !v)}
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5 text-primary" />
        {total > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border bg-white shadow-brand-lg">
          <div className="border-b px-4 py-3">
            <p className="font-semibold text-primary">Notificações</p>
          </div>
          {!notificacoes?.length && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </p>
          )}
          {notificacoes?.map((n) => (
            <button
              key={n.id}
              type="button"
              className={cn(
                "w-full border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted/50",
                !n.lida && "bg-accent/10",
              )}
              onClick={() => {
                if (!n.lida) marcarLida.mutate(n.id);
                if (n.url) {
                  track("notification_opened", { tipo: n.tipo });
                  track("deep_link_opened", { url: n.url });
                  navigate(n.url);
                  setAberto(false);
                }
              }}
            >
              <p className="text-sm font-medium text-primary">{n.titulo}</p>
              {n.corpo && (
                <p className="mt-0.5 text-xs text-muted-foreground">{n.corpo}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
