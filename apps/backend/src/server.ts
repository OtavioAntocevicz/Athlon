import app from "./app.js";
import { env } from "./config/env.js";
import { startCronJobs } from "./jobs/cron.js";

if (env.cronEnabled) {
  startCronJobs();
  console.log("[cron] Jobs agendados: avisos (horário), diário (06:00), mensal (dia 1, 07:00)");
} else {
  console.log("[cron] Desabilitado (CRON_ENABLED=false)");
}

const server = app.listen(env.port, () => {
  console.log(`ATHLON API rodando em http://localhost:${env.port}`);
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    console.warn("[web-push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes — push da barra do sistema desligado");
  }
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Porta ${env.port} já está em uso. Encerre o processo anterior ou use outra porta (PORT no .env).`,
    );
    console.error(`Teste: http://localhost:${env.port}/health`);
    process.exit(1);
  }
  throw err;
});
