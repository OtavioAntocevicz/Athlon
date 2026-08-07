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

export interface StorageService {
  createComprovanteUploadUrl(pagamentoId: string, contentType: string): Promise<UploadUrlResult>;
  createTurmaFotoUploadUrl(turmaId: string, contentType: string): Promise<FotoUploadUrlResult>;
  getSignedReadUrl(arquivoUrl: string | null | undefined): Promise<string | null>;
  deleteComprovante(arquivoUrl: string | null | undefined): Promise<void>;
  deleteTurmaFoto(fotoUrl: string | null | undefined): Promise<void>;
}
