import { cn } from "@/lib/utils";
import { Label } from "./input";

interface FieldProps {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  optionalLabel?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint/error, wired with aria-describedby by id convention. */
export function Field({ id, label, hint, error, optionalLabel, className, children }: FieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={id}>
        {label}
        {optionalLabel && <span className="ml-1.5 text-xs font-normal text-muted">({optionalLabel})</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
