import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
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

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const api = express.Router();
api.use("/auth", authRouter);
api.use("/turmas", turmasRouter);
api.use("/alunos", alunosRouter);
api.use("/mensalidades", mensalidadesRouter);
api.use("/mensalidades/:id/comprovante", mensalidadeComprovanteRouter);
api.use("/comprovantes", comprovantesRouter);
api.use("/dashboard", dashboardRouter);
api.use("/notificacoes", notificacoesRouter);
api.use("/avisos", avisosRouter);

app.use("/api/v1", api);
app.use("/api/cron", cronRouter);
app.use(errorHandler);

export default app;
