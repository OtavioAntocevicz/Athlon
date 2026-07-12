-- Chamados também para professor (aluno_id OU professor_id)
ALTER TABLE "Chamado"
  ALTER COLUMN "aluno_id" DROP NOT NULL;

ALTER TABLE "Chamado"
  ADD COLUMN IF NOT EXISTS "professor_id" TEXT;

DO $$ BEGIN
  ALTER TABLE "Chamado"
    ADD CONSTRAINT "Chamado_professor_id_fkey"
    FOREIGN KEY ("professor_id") REFERENCES "Professor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Chamado"
    ADD CONSTRAINT "Chamado_autor_chk"
    CHECK (
      ("aluno_id" IS NOT NULL AND "professor_id" IS NULL)
      OR ("aluno_id" IS NULL AND "professor_id" IS NOT NULL)
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Chamado_professor_id_criado_em_idx"
  ON "Chamado"("professor_id", "criado_em" DESC);
