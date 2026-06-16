import type { Request, Response } from "express";

type ExpressApp = (req: Request, res: Response) => void;

let app: ExpressApp | null = null;
let loadError: string | null = null;
let loading: Promise<void> | null = null;

async function loadApp(): Promise<ExpressApp | null> {
  if (app) return app;
  if (loadError) return null;

  if (!loading) {
    loading = (async () => {
      try {
        const mod = await import("../apps/backend/dist/app.js");
        app = mod.default;
      } catch (err) {
        console.error("[api] Falha ao carregar o backend:", err);
        loadError =
          err instanceof Error && err.message.includes("Missing env")
            ? "API não configurada. Defina JWT_SECRET, JWT_REFRESH_SECRET, SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel."
            : "API indisponível. Verifique os logs do deploy na Vercel.";
      }
    })();
  }

  await loading;
  return app;
}

export default async function handler(req: Request, res: Response) {
  const expressApp = await loadApp();

  if (!expressApp) {
    return res.status(503).json({
      error: {
        code: "API_UNAVAILABLE",
        message: loadError ?? "API indisponível.",
      },
    });
  }

  return expressApp(req, res);
}
