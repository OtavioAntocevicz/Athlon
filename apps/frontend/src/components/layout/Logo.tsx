const iconClass = {
  sm: "h-7 w-7 min-h-7 min-w-7",
  md: "h-9 w-9 min-h-9 min-w-9",
  lg: "h-[52px] w-[52px] min-h-[52px] min-w-[52px]",
} as const;

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const textSizes = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" };

  return (
    <div className="inline-flex items-center gap-2.5">
      <img
        src="/logo.png"
        alt=""
        className={`shrink-0 object-contain drop-shadow-sm ${iconClass[size]}`}
        draggable={false}
      />
      <span className={`font-bold tracking-tight text-primary ${textSizes[size]}`}>
        ATHLON
      </span>
    </div>
  );
}
