import { forwardRef, type InputHTMLAttributes } from "react";
import { Input } from "./input";

interface MaskedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  mask: (value: string) => string;
  onChange?: (value: string) => void;
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  function MaskedInput({ mask, onChange, onBlur, value, ...props }, ref) {
    return (
      <Input
        ref={ref}
        inputMode="numeric"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => {
          const masked = mask(e.target.value);
          onChange?.(masked);
        }}
        onBlur={onBlur}
        {...props}
      />
    );
  },
);
