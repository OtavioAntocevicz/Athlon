-- Sessões com refresh token opaco (rotação + revogação)
CREATE TABLE IF NOT EXISTS "Sessao" (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES "Usuario"(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  revogada_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_uso_em TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS sessao_token_hash_idx ON "Sessao" (token_hash);
CREATE INDEX IF NOT EXISTS sessao_usuario_idx ON "Sessao" (usuario_id);
CREATE INDEX IF NOT EXISTS sessao_usuario_ativa_idx ON "Sessao" (usuario_id) WHERE revogada_em IS NULL;
