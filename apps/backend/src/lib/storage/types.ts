export type UploadUrlResult = {
  uploadUrl: string;
  path: string;
  arquivoUrl: string;
};

export type FotoUploadUrlResult = {
  uploadUrl: string;
  path: string;
  fotoUrl: string;
};

export type UploadedFotoResult = {
  path: string;
  fotoUrl: string;
};

export type UploadedArquivoResult = {
  path: string;
  arquivoUrl: string;
};

export interface StorageService {
  createComprovanteUploadUrl(pagamentoId: string, contentType: string): Promise<UploadUrlResult>;
  createTurmaFotoUploadUrl(turmaId: string, contentType: string): Promise<FotoUploadUrlResult>;
  uploadTurmaFoto(
    turmaId: string,
    contentType: string,
    body: Buffer,
  ): Promise<UploadedFotoResult>;
  uploadComprovante(
    pagamentoId: string,
    contentType: string,
    body: Buffer,
  ): Promise<UploadedArquivoResult>;
  getSignedReadUrl(arquivoUrl: string | null | undefined): Promise<string | null>;
  deleteComprovante(arquivoUrl: string | null | undefined): Promise<void>;
  deleteTurmaFoto(fotoUrl: string | null | undefined): Promise<void>;
}
