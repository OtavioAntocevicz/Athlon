/** Entrypoint serverless Vercel → Express (apps/backend/dist/app.js) */

type ApiRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => unknown;
  setHeader?: (name: string, value: string | number | string[]) => void;
  end?: (chunk?: unknown) => void;
};

type ExpressApp = (req: ApiRequest, res: ApiResponse) => unknown;

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
        app = mod.default as ExpressApp;
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
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
