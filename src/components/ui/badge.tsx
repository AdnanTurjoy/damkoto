import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-paper-deep text-muted",
  brand: "bg-brand-50 text-brand-800",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-50 text-red-700",
  sky: "bg-sky-50 text-sky-800",
} as const;

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3.5", tones[tone], className)}
      {...props}
    />
  );
}
