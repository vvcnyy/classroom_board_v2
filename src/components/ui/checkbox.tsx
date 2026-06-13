import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
  <label className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
    <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
    <span
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded-sm border border-primary bg-background text-primary-foreground ring-offset-background peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-checked:bg-primary",
        className
      )}
    />
    <Check className="pointer-events-none absolute h-3 w-3 opacity-0 peer-checked:opacity-100" />
  </label>
));
Checkbox.displayName = "Checkbox";

export { Checkbox };
