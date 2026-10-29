import { cn } from "@/lib/utils";

/** Price-tag mark with the taka sign — original artwork. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-9", className)}>
      <path d="M8 6h22a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H8L2 20Z" fill="var(--color-brand-600)" />
      <circle cx="9.5" cy="20" r="2.4" fill="var(--color-paper)" />
      <text x="22" y="27.5" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--color-amber-300)" fontFamily="var(--font-sans)">
        ৳
      </text>
    </svg>
  );
}

export function Logo({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-xl font-bold tracking-tight text-brand-800">{name}</span>
    </span>
  );
}
