import { getStorageService } from "./r2-storage.service.js";

export async function criarUploadUrl(pagamentoId: string, contentType: string) {
  return getStorageService().createComprovanteUploadUrl(pagamentoId, contentType);
}

export async function criarUploadUrlFotoTurma(turmaId: string, contentType: string) {
  return getStorageService().createTurmaFotoUploadUrl(turmaId, contentType);
}

export async function uploadFotoTurmaStorage(
  turmaId: string,
  contentType: string,
  body: Buffer,
) {
  return getStorageService().uploadTurmaFoto(turmaId, contentType, body);
}

export async function uploadComprovanteStorage(
  pagamentoId: string,
  contentType: string,
  body: Buffer,
) {
  return getStorageService().uploadComprovante(pagamentoId, contentType, body);
}

export async function getSignedReadUrl(arquivoUrl: string | null | undefined) {
  return getStorageService().getSignedReadUrl(arquivoUrl);
}

export async function removerArquivoStorage(arquivoUrl: string | null | undefined) {
  return getStorageService().deleteComprovante(arquivoUrl);
}

export async function removerFotoTurmaStorage(fotoUrl: string | null | undefined) {
  return getStorageService().deleteTurmaFoto(fotoUrl);
}
