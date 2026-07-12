-- Foto de perfil/capa da turma
ALTER TABLE "Turma" ADD COLUMN IF NOT EXISTS "foto_url" TEXT;

-- Bucket público para fotos de turma
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'turmas-fotos',
  'turmas-fotos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;
