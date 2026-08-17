import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { globalApiLimiter } from "./middleware/rate-limit.js";
import { validateOrigin } from "./middleware/validate-origin.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { turmasRouter } from "./modules/turmas/turmas.routes.js";
import { alunosRouter } from "./modules/alunos/alunos.routes.js";
import { mensalidadesRouter } from "./modules/mensalidades/mensalidades.routes.js";
import {
  comprovantesRouter,
  mensalidadeComprovanteRouter,
} from "./modules/comprovantes/comprovantes.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { notificacoesRouter } from "./modules/notificacoes/notificacoes.routes.js";
import { avisosRouter } from "./modules/avisos/avisos.routes.js";
import { cronRouter } from "./modules/cron/cron.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { dispositivosRouter } from "./modules/dispositivos/dispositivos.routes.js";
import { eventosRouter } from "./modules/eventos/eventos.routes.js";
import { chamadosRouter, adminChamadosRouter } from "./modules/chamados/chamados.routes.js";

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// Na Vercel o invoke path pode vir separado da URL interna do Express.
app.use((req, _res, next) => {
  const invokePath = req.headers["x-vercel-invoke-path"];
  if (typeof invokePath === "string" && invokePath.startsWith("/api")) {
    req.url = invokePath;
  }
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      // Requests sem Origin (health checks, curl) são permitidos.
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, "");
      if (env.corsOrigins.includes(normalized)) return callback(null, true);
      console.warn(`[cors] Origem bloqueada: ${origin}. Permitidas: ${env.corsOrigins.join(", ")}`);
      return callback(null, false);
    },
    credentials: true,
  }),
);
// Base64 de fotos/comprovantes (até ~6–8 MB) precisa de limite maior que o default 100kb.
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const api = express.Router();
api.use(globalApiLimiter);
api.use(validateOrigin);
api.use("/auth", authRouter);
api.use("/turmas", turmasRouter);
api.use("/alunos", alunosRouter);
api.use("/mensalidades", mensalidadesRouter);
api.use("/mensalidades/:id/comprovante", mensalidadeComprovanteRouter);
api.use("/comprovantes", comprovantesRouter);
api.use("/dashboard", dashboardRouter);
api.use("/notificacoes", notificacoesRouter);
api.use("/dispositivos", dispositivosRouter);
api.use("/avisos", avisosRouter);
api.use("/eventos", eventosRouter);
api.use("/chamados", chamadosRouter);
api.use("/admin/chamados", adminChamadosRouter);
api.use("/admin", adminRouter);

app.use("/api/v1", api);
app.use("/api/cron", cronRouter);
app.use(errorHandler);

export default app;
