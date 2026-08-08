import { Component, type ErrorInfo, type ReactNode } from "react";
import { clearChunkReloadFlag } from "@/lib/lazy-with-retry";
import { LoadingScreen } from "./guards";

type Props = { children: ReactNode };
type State = { hasError: boolean };

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
 * Quando um chunk lazy some após deploy do PWA, o Suspense fica preso.
 * Recarrega a página uma vez para alinhar index.html + assets novos.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  private reloading = false;

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (this.reloading || !isRecoverableChunkError(error)) return;

    try {
      const key = "athlon:chunk-reload";
      if (!sessionStorage.getItem(key)) {
        this.reloading = true;
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(key);
    } catch {
      this.reloading = true;
      window.location.reload();
    }
  }

  componentDidUpdate(_prev: Props, prevState: State) {
    if (prevState.hasError && !this.state.hasError) {
      clearChunkReloadFlag();
    }
  }

  render() {
    if (this.state.hasError) {
      return <LoadingScreen />;
    }
    return this.props.children;
  }
}
