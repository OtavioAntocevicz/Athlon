import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "success";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-14 px-6 text-base w-full",
        variant === "primary" && "bg-primary text-white hover:bg-primary/90",
        variant === "secondary" && "bg-muted text-primary hover:bg-muted/80",
        variant === "outline" && "border-2 border-primary/20 bg-white text-primary hover:bg-muted",
        variant === "destructive" && "border-2 border-destructive text-destructive bg-white hover:bg-red-50",
        variant === "success" && "bg-success text-white hover:bg-success/90",
        className,
      )}
      {...props}
    />
  );
}
