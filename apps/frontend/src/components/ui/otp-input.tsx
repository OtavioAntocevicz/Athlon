import { useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { cn } from "@/lib/cn";

const LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function OtpInput({ value, onChange, disabled, autoFocus }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(LENGTH, " ").slice(0, LENGTH).split("");

  const setAt = (index: number, char: string) => {
    const next = digits.map((d, i) => (i === index ? char : d === " " ? "" : d)).join("").slice(0, LENGTH);
    onChange(next.replace(/\s/g, ""));
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) {
      setAt(index, "");
      return;
    }
    setAt(index, digit);
    if (index < LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (pasted) onChange(pasted);
  };

  return (
    <div className="flex justify-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          value={d.trim()}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onChange={(e) => handleChange(i, e.target.value)}
          onPaste={handlePaste}
          className={cn(
            "h-12 w-11 rounded-lg border border-primary/20 bg-white text-center text-lg font-semibold text-primary",
            "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
            disabled && "opacity-60",
          )}
          aria-label={`Dígito ${i + 1}`}
        />
      ))}
    </div>
  );
}
