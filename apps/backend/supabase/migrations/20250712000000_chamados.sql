-- Chamados de suporte (aluno → ADM)
DO $$ BEGIN
  CREATE TYPE "StatusChamado" AS ENUM ('ABERTO', 'RESPONDIDO', 'FECHADO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Chamado" (
  "id" TEXT NOT NULL,
  "aluno_id" TEXT NOT NULL,
  "assunto" TEXT NOT NULL,
  "mensagem" TEXT NOT NULL,
  "status" "StatusChamado" NOT NULL DEFAULT 'ABERTO',
  "resposta_admin" TEXT,
  "respondido_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Chamado_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Chamado_aluno_id_criado_em_idx"
  ON "Chamado"("aluno_id", "criado_em" DESC);

CREATE INDEX IF NOT EXISTS "Chamado_status_criado_em_idx"
  ON "Chamado"("status", "criado_em" DESC);

ALTER TABLE "Chamado"
  ADD CONSTRAINT "Chamado_aluno_id_fkey"
  FOREIGN KEY ("aluno_id") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Chamado" ENABLE ROW LEVEL SECURITY;
