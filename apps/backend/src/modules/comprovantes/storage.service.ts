import { nanoid } from "nanoid";
import { supabase } from "../../config/supabase.js";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error-handler.js";

export async function criarUploadUrl(pagamentoId: string, contentType: string) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(contentType)) {
    throw new AppError(400, "INVALID_TYPE", "Tipo de arquivo não permitido");
  }

  const ext = contentType.split("/")[1] === "pdf" ? "pdf" : "jpg";
  const path = `${pagamentoId}/${nanoid()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(env.storageBucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new AppError(500, "UPLOAD_ERROR", error?.message ?? "Erro ao gerar URL");
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
