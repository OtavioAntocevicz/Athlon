import { Button } from "@/components/ui/button";

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryError({
  message = "Não foi possível carregar esta página.",
  onRetry,
}: QueryErrorProps) {
  return (
    <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
