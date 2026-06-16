import type { Request, Response } from "express";

let app: ((req: Request, res: Response) => void) | null = null;
let loadError: string | null = null;

try {
  const mod = await import("../apps/backend/dist/app.js");
  app = mod.default;
} catch (err) {
  console.error("[api] Falha ao carregar o backend:", err);
  loadError =
    err instanceof Error && err.message.includes("Missing env")
      ? "API não configurada. Defina as variáveis de ambiente na Vercel (JWT_SECRET, SUPABASE_URL, etc.)."
      : "API indisponível. Verifique o deploy do backend.";
}

export default function handler(req: Request, res: Response) {
  if (!app) {
    return res.status(503).json({
      error: {
        code: "API_UNAVAILABLE",
        message: loadError ?? "API indisponível.",
      },
    });
  }
  return app(req, res);
}
