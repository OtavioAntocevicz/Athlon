import { cn } from "@/lib/cn";

interface FilterPillsProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterPills({ options, value, onChange }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm",
            value === opt.value
              ? "bg-primary text-white"
              : "bg-muted text-primary hover:bg-muted/80",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
