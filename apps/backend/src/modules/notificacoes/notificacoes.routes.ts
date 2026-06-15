import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as notificacoesService from "./notificacoes.service.js";
import { getVapidPublicKey } from "../../lib/push.js";

const pushTokenSchema = z.object({
  token: z.string().min(1),
});

export const notificacoesRouter = Router();

notificacoesRouter.use(authenticate);

notificacoesRouter.get("/vapid-public-key", (_req, res) => {
  const publicKey = getVapidPublicKey();
  res.json({ data: { publicKey } });
});

notificacoesRouter.get("/", async (req, res, next) => {
  try {
    const data = await notificacoesService.listarNotificacoes(req.user!.sub);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

notificacoesRouter.get("/contagem", async (req, res, next) => {
  try {
    const data = await notificacoesService.contarNaoLidas(req.user!.sub);
    res.json({ data: { total: data } });
  } catch (e) {
    next(e);
  }
});

notificacoesRouter.patch("/:id/lida", async (req, res, next) => {
  try {
    const data = await notificacoesService.marcarComoLida(
      String(req.params.id),
      req.user!.sub,
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

notificacoesRouter.post("/marcar-todas-lidas", async (req, res, next) => {
  try {
    const data = await notificacoesService.marcarTodasLidas(req.user!.sub);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

notificacoesRouter.post("/push-token", validate(pushTokenSchema), async (req, res, next) => {
  try {
    const data = await notificacoesService.registrarPushToken(req.user!.sub, req.body.token);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});
