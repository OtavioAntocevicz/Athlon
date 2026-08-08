import { Component, type ErrorInfo, type ReactNode } from "react";
import { clearChunkReloadFlag } from "@/lib/lazy-with-retry";
import { RouteErrorFallback } from "./RouteErrorFallback";

type Props = { children: ReactNode; resetKey?: string };
type State = { hasError: boolean; isChunkError: boolean };

function isRecoverableChunkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    error.name === "ChunkLoadError" ||
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("loading chunk") ||
    message.includes("loading css chunk")
  );
}

/**
 * Recupera falhas de chunk (PWA/deploy) e erros de render na rota.
 * Mantém shell/nav via RouteErrorFallback para o usuário não ficar preso.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkError: false };
  private reloading = false;

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, isChunkError: isRecoverableChunkError(error) };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (this.reloading || !isRecoverableChunkError(error)) return;

    try {
      const key = "athlon:chunk-reload";
      if (!sessionStorage.getItem(key)) {
        this.reloading = true;
        sessionStorage.setItem(key, "1");
        window.location.reload();
      } else {
        sessionStorage.removeItem(key);
      }
    } catch {
      this.reloading = true;
      window.location.reload();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, isChunkError: false });
      clearChunkReloadFlag();
    }
  }

  private handleRetry = () => {
    clearChunkReloadFlag();
    this.setState({ hasError: false, isChunkError: false });
  };

  render() {
    if (this.state.hasError) {
      return <RouteErrorFallback onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
