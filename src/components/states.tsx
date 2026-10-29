import { SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  text,
  action,
  icon,
  className,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center", className)}>
      <div className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 [&_svg]:size-7">{icon ?? <SearchX />}</div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      {text && <p className="mt-1.5 max-w-md text-[15px] text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pb-6 pt-8 md:flex-row md:items-end md:justify-between md:pt-10">
      <div>
        <h1 className="text-[1.75rem] font-bold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-muted md:text-base">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6", className)}>{children}</div>;
}
