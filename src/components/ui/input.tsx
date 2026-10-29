import { cn } from "@/lib/utils";

export const fieldClasses =
  "w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-muted/70 transition-colors " +
  "hover:border-brand-200 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-100 " +
  "disabled:bg-paper-deep disabled:opacity-70 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-100";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClasses, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

/** Native select: accessible, keyboard- and mobile-friendly by default. */
export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        fieldClasses,
        "h-11 appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235b6860' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-semibold text-ink", className)} {...props} />;
}

export function Checkbox({ className, label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex min-h-10 cursor-pointer items-center gap-2.5 text-[15px]", className)}>
      <input type="checkbox" className="size-4.5 shrink-0 rounded accent-brand-600" {...props} />
      <span>{label}</span>
    </label>
  );
}
