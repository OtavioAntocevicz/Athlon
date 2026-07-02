-- Tabela Dispositivo (sucessor de TokenPushFcm) + url em Notificacao

CREATE TABLE IF NOT EXISTS "Dispositivo" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "push_provider" TEXT NOT NULL,
    "push_token" TEXT NOT NULL,
    "app_version" TEXT,
    "os_version" TEXT,
    "device_model" TEXT,
    "language" TEXT,
    "timezone" TEXT,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notification_permission" TEXT NOT NULL DEFAULT 'default',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Dispositivo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Dispositivo_usuario_push_token_key"
  ON "Dispositivo"("usuario_id", "push_token");

CREATE INDEX IF NOT EXISTS "Dispositivo_usuario_id_idx"
  ON "Dispositivo"("usuario_id");

DO $$ BEGIN
  ALTER TABLE "Dispositivo"
    ADD CONSTRAINT "Dispositivo_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Dispositivo" ENABLE ROW LEVEL SECURITY;

-- Migra tokens Web Push existentes (TokenPushFcm legado pode não ter atualizado_em)
INSERT INTO "Dispositivo" (
    "id", "usuario_id", "platform", "push_provider", "push_token",
    "last_seen", "notification_permission", "criado_em", "atualizado_em"
)
SELECT
    t."id",
    t."usuario_id",
    'WEB',
    'WEB',
    t."token",
    t."criado_em",
    'granted',
    t."criado_em",
    t."criado_em"
FROM "TokenPushFcm" t
ON CONFLICT ("usuario_id", "push_token") DO NOTHING;

ALTER TABLE "Notificacao" ADD COLUMN IF NOT EXISTS "url" TEXT;
