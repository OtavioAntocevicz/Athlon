-- Verificação de e-mail para alunos (cadastro self-service)

ALTER TABLE "Usuario"
  ADD COLUMN IF NOT EXISTS "email_verificado_em" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "VerificacaoEmail" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "codigo_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificacaoEmail_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VerificacaoEmail_usuario_id_criado_em_idx"
  ON "VerificacaoEmail"("usuario_id", "criado_em" DESC);

CREATE INDEX IF NOT EXISTS "VerificacaoEmail_expira_em_idx"
  ON "VerificacaoEmail"("expira_em")
  WHERE "usado_em" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VerificacaoEmail_usuario_id_fkey'
  ) THEN
    ALTER TABLE "VerificacaoEmail"
      ADD CONSTRAINT "VerificacaoEmail_usuario_id_fkey"
      FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
