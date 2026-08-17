-- MFA TOTP para administradores
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS mfa_habilitado_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS "MfaBackupCode" (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES "Usuario"(id) ON DELETE CASCADE,
  codigo_hash TEXT NOT NULL,
  usado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mfa_backup_usuario_idx ON "MfaBackupCode" (usuario_id);
CREATE UNIQUE INDEX IF NOT EXISTS mfa_backup_codigo_hash_idx ON "MfaBackupCode" (codigo_hash);

-- Log de auditoria de ações administrativas
CREATE TABLE IF NOT EXISTS "AuditoriaAdmin" (
  id TEXT PRIMARY KEY,
  admin_usuario_id TEXT NOT NULL REFERENCES "Usuario"(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id TEXT,
  detalhes JSONB,
  ip TEXT,
  user_agent TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auditoria_admin_criado_idx ON "AuditoriaAdmin" (criado_em DESC);
CREATE INDEX IF NOT EXISTS auditoria_admin_acao_idx ON "AuditoriaAdmin" (acao);
