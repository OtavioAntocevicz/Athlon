type SessionLostHandler = () => void;

let sessionLostHandler: SessionLostHandler | null = null;

export function setSessionLostHandler(handler: SessionLostHandler | null): void {
  sessionLostHandler = handler;
}

export function notifySessionLost(): void {
  sessionLostHandler?.();
}
