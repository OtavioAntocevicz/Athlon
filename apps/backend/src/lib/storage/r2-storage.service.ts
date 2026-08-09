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
import type {
  FotoUploadUrlResult,
  StorageService,
  UploadedArquivoResult,
  UploadedFotoResult,
  UploadUrlResult,
} from "./types.js";

const COMPROVANTE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
const FOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FOTO_BYTES = 6 * 1024 * 1024;
const MAX_COMPROVANTE_BYTES = 8 * 1024 * 1024;

function normalizeContentType(contentType: string): string {
  const ct = contentType.trim().toLowerCase();
  if (ct === "image/jpg") return "image/jpeg";
  return ct;
}

function extFromContentType(contentType: string, forPdf = false): string {
  if (forPdf && contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

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
    const ct = normalizeContentType(contentType);
    if (!COMPROVANTE_TYPES.includes(ct as (typeof COMPROVANTE_TYPES)[number])) {
      throw new AppError(400, "INVALID_TYPE", "Tipo de arquivo não permitido");
    }

    const path = `comprovantes/${pagamentoId}/${nanoid()}.${extFromContentType(ct, true)}`;
    const client = getClient();

    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: env.r2Bucket,
        Key: path,
        ContentType: ct,
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
    const ct = normalizeContentType(contentType);
    if (!FOTO_TYPES.includes(ct as (typeof FOTO_TYPES)[number])) {
      throw new AppError(400, "INVALID_TYPE", "Tipo de imagem não permitido. Use JPEG, PNG ou WebP.");
    }

    const path = `turmas-fotos/turmas/${turmaId}/${nanoid()}.${extFromContentType(ct)}`;
    const client = getClient();

    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: env.r2Bucket,
        Key: path,
        ContentType: ct,
      }),
      { expiresIn: 300 },
    );

    return {
      uploadUrl,
      path,
      fotoUrl: publicUrl(path),
    };
  }

  async uploadTurmaFoto(
    turmaId: string,
    contentType: string,
    body: Buffer,
  ): Promise<UploadedFotoResult> {
    const ct = normalizeContentType(contentType);
    if (!FOTO_TYPES.includes(ct as (typeof FOTO_TYPES)[number])) {
      throw new AppError(400, "INVALID_TYPE", "Tipo de imagem não permitido. Use JPEG, PNG ou WebP.");
    }
    if (!body.length) {
      throw new AppError(400, "EMPTY_FILE", "Arquivo vazio");
    }
    if (body.length > MAX_FOTO_BYTES) {
      throw new AppError(400, "FILE_TOO_LARGE", "Foto muito grande. Máximo 6 MB.");
    }

    const path = `turmas-fotos/turmas/${turmaId}/${nanoid()}.${extFromContentType(ct)}`;
    const client = getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: env.r2Bucket,
        Key: path,
        Body: body,
        ContentType: ct,
      }),
    );

    return { path, fotoUrl: publicUrl(path) };
  }

  async uploadComprovante(
    pagamentoId: string,
    contentType: string,
    body: Buffer,
  ): Promise<UploadedArquivoResult> {
    const ct = normalizeContentType(contentType);
    if (!COMPROVANTE_TYPES.includes(ct as (typeof COMPROVANTE_TYPES)[number])) {
      throw new AppError(400, "INVALID_TYPE", "Tipo de arquivo não permitido");
    }
    if (!body.length) {
      throw new AppError(400, "EMPTY_FILE", "Arquivo vazio");
    }
    if (body.length > MAX_COMPROVANTE_BYTES) {
      throw new AppError(400, "FILE_TOO_LARGE", "Arquivo muito grande. Máximo 8 MB.");
    }

    const path = `comprovantes/${pagamentoId}/${nanoid()}.${extFromContentType(ct, true)}`;
    const client = getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: env.r2Bucket,
        Key: path,
        Body: body,
        ContentType: ct,
      }),
    );

    return { path, arquivoUrl: path };
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
