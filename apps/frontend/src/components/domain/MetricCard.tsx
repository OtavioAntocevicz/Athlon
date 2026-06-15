import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  accent?: "default" | "warning" | "success";
}

export function MetricCard({ title, value, subtitle, icon: Icon, accent = "default" }: MetricCardProps) {
  return (
    <Card className="flex items-start gap-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          accent === "warning" ? "bg-red-50 text-destructive" :
          accent === "success" ? "bg-green-50 text-success" :
          "bg-muted text-primary"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-xl font-bold text-primary">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </Card>
  );
}
