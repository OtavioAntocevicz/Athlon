import { nanoid } from "nanoid";
import { supabase } from "../../config/supabase.js";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error-handler.js";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

let bucketReady: Promise<void> | null = null;

function mapStorageError(message?: string): string {
  if (!message) return "Erro ao preparar envio da foto";
  const lower = message.toLowerCase();
  if (
    lower.includes("related resource does not exist") ||
    lower.includes("resource was not found") ||
    lower.includes("bucket not found") ||
    lower.includes("nosuchbucket")
  ) {
    return `Armazenamento não configurado. Crie o bucket "${env.turmasFotosBucket}" no Supabase Storage (ou rode a migration 20250711000000_turma_foto.sql).`;
  }
  return message;
}

function publicFotoUrl(path: string): string {
  return `${env.supabaseUrl}/storage/v1/object/public/${env.turmasFotosBucket}/${path}`;
}

function pathFromFotoUrl(fotoUrl: string): string | null {
  const publicPrefix = `/storage/v1/object/public/${env.turmasFotosBucket}/`;
  const privatePrefix = `/storage/v1/object/${env.turmasFotosBucket}/`;

  let idx = fotoUrl.indexOf(publicPrefix);
  if (idx !== -1) return fotoUrl.slice(idx + publicPrefix.length);

  idx = fotoUrl.indexOf(privatePrefix);
  if (idx !== -1) return fotoUrl.slice(idx + privatePrefix.length);

  return null;
}

async function ensureTurmasFotosBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (!listError && buckets?.some((b) => b.name === env.turmasFotosBucket)) {
        return;
      }

      const { error: createError } = await supabase.storage.createBucket(env.turmasFotosBucket, {
        public: true,
        fileSizeLimit: 5242880,
        allowedMimeTypes: [...ALLOWED_IMAGE_TYPES],
      });

      if (createError && !createError.message.toLowerCase().includes("already exists")) {
        console.error("[storage] Falha ao criar bucket de fotos:", createError.message);
      }
    })();
  }

  await bucketReady;
}

export async function criarUploadUrlFotoTurma(turmaId: string, contentType: string) {
  if (!ALLOWED_IMAGE_TYPES.includes(contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new AppError(400, "INVALID_TYPE", "Tipo de imagem não permitido. Use JPEG, PNG ou WebP.");
  }

  await ensureTurmasFotosBucket();

  const mimeExt = contentType.split("/")[1];
  const ext = mimeExt === "png" ? "png" : mimeExt === "webp" ? "webp" : "jpg";
  const path = `turmas/${turmaId}/${nanoid()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(env.turmasFotosBucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new AppError(500, "UPLOAD_ERROR", mapStorageError(error?.message));
  }

  return {
    uploadUrl: data.signedUrl,
    path,
    fotoUrl: publicFotoUrl(path),
    token: data.token,
  };
}

export async function removerFotoTurmaStorage(fotoUrl: string | null | undefined) {
  if (!fotoUrl) return;
  const path = pathFromFotoUrl(fotoUrl);
  if (!path) return;
  await supabase.storage.from(env.turmasFotosBucket).remove([path]);
}
