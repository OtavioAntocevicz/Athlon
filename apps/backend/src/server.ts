import app from "./app.js";
import { env } from "./config/env.js";
import { startCronJobs } from "./jobs/cron.js";

startCronJobs();

const server = app.listen(env.port, () => {
  console.log(`ATHLON API rodando em http://localhost:${env.port}`);
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
