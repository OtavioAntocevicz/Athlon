import { cn } from "@/lib/cn";

type Step = { id: number; label: string };

type StepIndicatorProps = {
  steps: Step[];
  current: number;
  className?: string;
};

export function StepIndicator({ steps, current, className }: StepIndicatorProps) {
  return (
    <ol className={cn("flex items-center justify-between gap-2", className)}>
      {steps.map((step) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <li key={step.id} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                done && "bg-success text-white",
                active && "bg-primary text-white ring-2 ring-accent",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {step.id}
            </span>
            <span
              className={cn(
                "text-center text-[10px] font-medium leading-tight",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
