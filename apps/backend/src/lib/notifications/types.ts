export interface NotificationPayload {
  titulo: string;
  corpo: string;
  tipo: string;
  url?: string;
  data?: Record<string, string>;
}

export interface NotificationProvider {
  readonly name: string;
  send(usuarioId: string, payload: NotificationPayload): Promise<void>;
}
