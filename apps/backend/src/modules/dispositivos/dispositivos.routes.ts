import { Router } from "express";
import { registrarDispositivoSchema } from "@athlon/shared-types";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { registrarDispositivo } from "../../lib/devices/device.service.js";

export const dispositivosRouter = Router();

dispositivosRouter.use(authenticate);

dispositivosRouter.post("/", validate(registrarDispositivoSchema), async (req, res, next) => {
  try {
    const data = await registrarDispositivo(req.user!.sub, req.body);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});
