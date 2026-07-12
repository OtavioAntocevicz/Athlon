-- Permite limpar arquivo_url após aprovar/recusar (arquivo já removido do Storage)
ALTER TABLE "Comprovante"
  ALTER COLUMN "arquivo_url" DROP NOT NULL;
