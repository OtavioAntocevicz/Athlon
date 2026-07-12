import { cn } from "@/lib/cn";

interface FilterPillsProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterPills({ options, value, onChange }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-lg px-3.5 py-2 text-xs font-semibold transition-all sm:px-4 sm:text-sm",
              active
                ? "bg-primary text-white shadow-brand-card ring-1 ring-primary/20"
                : "border border-primary/10 bg-card text-primary shadow-sm hover:border-primary/25 hover:bg-muted/60",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
