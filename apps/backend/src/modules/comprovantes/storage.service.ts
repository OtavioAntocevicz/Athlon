import { nanoid } from "nanoid";
import { supabase } from "../../config/supabase.js";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error-handler.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

let bucketReady: Promise<void> | null = null;

function mapStorageError(message?: string): string {
  if (!message) return "Erro ao preparar envio do comprovante";
  const lower = message.toLowerCase();
  if (
    lower.includes("related resource does not exist") ||
    lower.includes("resource was not found") ||
    lower.includes("bucket not found") ||
    lower.includes("nosuchbucket")
  ) {
    return `Armazenamento não configurado. Crie o bucket "${env.storageBucket}" no Supabase Storage (ou rode a migration storage_comprovantes).`;
  }
  return message;
}

async function ensureStorageBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (!listError && buckets?.some((b) => b.name === env.storageBucket)) {
        return;
      }

      const { error: createError } = await supabase.storage.createBucket(env.storageBucket, {
        public: false,
      });

      if (createError && !createError.message.toLowerCase().includes("already exists")) {
        console.error("[storage] Falha ao criar bucket:", createError.message);
      }
    })();
  }

  await bucketReady;
}

export async function criarUploadUrl(pagamentoId: string, contentType: string) {
  if (!ALLOWED_TYPES.includes(contentType as (typeof ALLOWED_TYPES)[number])) {
    throw new AppError(400, "INVALID_TYPE", "Tipo de arquivo não permitido");
  }

  await ensureStorageBucket();

  const ext = contentType.split("/")[1] === "pdf" ? "pdf" : "jpg";
  const path = `${pagamentoId}/${nanoid()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(env.storageBucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new AppError(500, "UPLOAD_ERROR", mapStorageError(error?.message));
  }

  const publicUrl = `${env.supabaseUrl}/storage/v1/object/${env.storageBucket}/${path}`;

  return {
    uploadUrl: data.signedUrl,
    path,
    arquivoUrl: publicUrl,
    token: data.token,
  };
}

export async function removerArquivoStorage(arquivoUrl: string) {
  const bucketPrefix = `/storage/v1/object/${env.storageBucket}/`;
  const idx = arquivoUrl.indexOf(bucketPrefix);
  if (idx === -1) return;

  const path = arquivoUrl.slice(idx + bucketPrefix.length);
  await supabase.storage.from(env.storageBucket).remove([path]);
}

export async function getSignedReadUrl(arquivoUrl: string) {
  const bucketPrefix = `/storage/v1/object/${env.storageBucket}/`;
  const idx = arquivoUrl.indexOf(bucketPrefix);
  if (idx === -1) return arquivoUrl;

  const path = arquivoUrl.slice(idx + bucketPrefix.length);
  const { data, error } = await supabase.storage
    .from(env.storageBucket)
    .createSignedUrl(path, 300);

  if (error || !data) return arquivoUrl;
  return data.signedUrl;
}
