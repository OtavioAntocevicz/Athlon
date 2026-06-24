-- Tokens de recuperação de senha (código + link mágico)
CREATE TABLE "RecuperacaoSenha" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "codigo_hash" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecuperacaoSenha_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecuperacaoSenha_usuario_id_criado_em_idx"
  ON "RecuperacaoSenha"("usuario_id", "criado_em" DESC);

CREATE INDEX "RecuperacaoSenha_expira_em_idx"
  ON "RecuperacaoSenha"("expira_em")
  WHERE "usado_em" IS NULL;

ALTER TABLE "RecuperacaoSenha"
  ADD CONSTRAINT "RecuperacaoSenha_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecuperacaoSenha" ENABLE ROW LEVEL SECURITY;
