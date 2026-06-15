import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageEnterProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "up" | "fade";
};

export function PageEnter({
  children,
  className,
  delay = 0,
  variant = "up",
}: PageEnterProps) {
  return (
    <div
      className={cn(variant === "up" ? "animate-fade-in-up" : "animate-fade-in", className)}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
