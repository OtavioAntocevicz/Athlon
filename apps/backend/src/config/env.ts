import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  jwtSecret: required("JWT_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  storageBucket: process.env.STORAGE_BUCKET ?? "comprovantes",
  turmasFotosBucket: process.env.TURMAS_FOTOS_BUCKET ?? "turmas-fotos",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? null,
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:suporte@athlon.app",
  cronSecret: process.env.CRON_SECRET ?? null,
  resendApiKey: process.env.RESEND_API_KEY ?? null,
  emailFrom: process.env.EMAIL_FROM ?? "ATHLON <onboarding@resend.dev>",
  appUrl: process.env.APP_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:5173",
  /** Temporário: devolve código/link na API e mostra na tela (sem e-mail). Desligar em produção real. */
  recoveryShowCode: process.env.RECOVERY_SHOW_CODE === "true",
};
