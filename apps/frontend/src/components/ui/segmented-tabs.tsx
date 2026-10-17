import { cn } from "@/lib/cn";

export type SegmentedTab<T extends string> = { id: T; label: string };

type SegmentedTabsProps<T extends string> = {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
};

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-xl bg-muted p-1",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:text-sm",
              active ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-primary",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
