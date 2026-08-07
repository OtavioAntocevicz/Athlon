import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error-handler.js";
import type { FotoUploadUrlResult, StorageService, UploadUrlResult } from "./types.js";

const COMPROVANTE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
const FOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function getClient(): S3Client {
  if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey) {
    throw new AppError(
      503,
      "STORAGE_UNAVAILABLE",
      "Armazenamento não configurado. Defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY.",
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  });
}

function publicUrl(key: string): string {
  const base = env.r2PublicBaseUrl?.replace(/\/$/, "");
  if (!base) {
    throw new AppError(
      503,
      "STORAGE_UNAVAILABLE",
      "R2_PUBLIC_BASE_URL não configurado para URLs públicas.",
    );
  }
  return `${base}/${key}`;
}

function keyFromUrl(url: string, prefix: string): string | null {
  const normalized = url.split("?")[0];
  const idx = normalized.indexOf(prefix);
  if (idx === -1) return null;
  return normalized.slice(idx);
}

export class R2StorageService implements StorageService {
  async createComprovanteUploadUrl(
    pagamentoId: string,
    contentType: string,
  ): Promise<UploadUrlResult> {
    if (!COMPROVANTE_TYPES.includes(contentType as (typeof COMPROVANTE_TYPES)[number])) {
      throw new AppError(400, "INVALID_TYPE", "Tipo de arquivo não permitido");
    }

    const ext = contentType.split("/")[1] === "pdf" ? "pdf" : "jpg";
    const path = `comprovantes/${pagamentoId}/${nanoid()}.${ext}`;
    const client = getClient();

    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: env.r2Bucket,
        Key: path,
        ContentType: contentType,
      }),
      { expiresIn: 300 },
    );

    return {
      uploadUrl,
      path,
      arquivoUrl: path,
    };
  }

  async createTurmaFotoUploadUrl(
    turmaId: string,
    contentType: string,
  ): Promise<FotoUploadUrlResult> {
    if (!FOTO_TYPES.includes(contentType as (typeof FOTO_TYPES)[number])) {
      throw new AppError(400, "INVALID_TYPE", "Tipo de imagem não permitido. Use JPEG, PNG ou WebP.");
    }

    const mimeExt = contentType.split("/")[1];
    const ext = mimeExt === "png" ? "png" : mimeExt === "webp" ? "webp" : "jpg";
    const path = `turmas-fotos/turmas/${turmaId}/${nanoid()}.${ext}`;
    const client = getClient();

    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: env.r2Bucket,
        Key: path,
        ContentType: contentType,
      }),
      { expiresIn: 300 },
    );

    return {
      uploadUrl,
      path,
      fotoUrl: publicUrl(path),
    };
  }

  async getSignedReadUrl(arquivoUrl: string | null | undefined): Promise<string | null> {
    if (!arquivoUrl) return null;

    const key = arquivoUrl.startsWith("comprovantes/")
      ? arquivoUrl
      : keyFromUrl(arquivoUrl, "comprovantes/");

    if (!key) return arquivoUrl;

    const client = getClient();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: env.r2Bucket, Key: key }),
      { expiresIn: 300 },
    );
  }

  async deleteComprovante(arquivoUrl: string | null | undefined): Promise<void> {
    if (!arquivoUrl) return;

    const key = arquivoUrl.startsWith("comprovantes/")
      ? arquivoUrl
      : keyFromUrl(arquivoUrl, "comprovantes/");

    if (!key) return;

    try {
      const client = getClient();
      await client.send(new DeleteObjectCommand({ Bucket: env.r2Bucket, Key: key }));
    } catch (err) {
      console.error("[storage] Falha ao remover comprovante:", key, err);
    }
  }

  async deleteTurmaFoto(fotoUrl: string | null | undefined): Promise<void> {
    if (!fotoUrl) return;

    let key: string | null = null;
    if (fotoUrl.startsWith("turmas-fotos/")) {
      key = fotoUrl;
    } else {
      key = keyFromUrl(fotoUrl, "turmas-fotos/");
    }

    if (!key) return;

    try {
      const client = getClient();
      await client.send(new DeleteObjectCommand({ Bucket: env.r2Bucket, Key: key }));
    } catch (err) {
      console.error("[storage] Falha ao remover foto de turma:", key, err);
    }
  }
}

let storageInstance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!storageInstance) {
    storageInstance = new R2StorageService();
  }
  return storageInstance;
}
