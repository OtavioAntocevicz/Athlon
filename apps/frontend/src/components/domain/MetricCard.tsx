import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  accent?: "default" | "warning" | "success" | "danger";
  /** Valores longos (ex.: datas) usam tipografia menor */
  compact?: boolean;
}

const ACCENT_STYLES = {
  default: "bg-muted text-primary",
  warning: "bg-accent/15 text-accent-strong",
  success: "bg-success/10 text-success",
  danger: "bg-destructive/10 text-destructive",
} as const;

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "default",
  compact = false,
}: MetricCardProps) {
  return (
    <Card className="flex items-start gap-3">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ACCENT_STYLES[accent]}`}
      >
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p
          className={cn(
            "font-bold text-primary",
            compact ? "text-sm leading-snug tabular-nums" : "text-xl",
          )}
        >
          {value}
        </p>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </Card>
  );
}
