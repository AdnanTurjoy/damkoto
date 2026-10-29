import { List, Map } from "lucide-react";
import Link from "next/link";
import type { Translate } from "@/lib/i18n/core";
import { cn } from "@/lib/utils";

/** List ↔ map switch that carries the current filters across. */
export function ViewToggle({ active, query, t }: { active: "list" | "map"; query: string; t: Translate }) {
  const suffix = query ? `?${query}` : "";
  const item = (key: "list" | "map", href: string, label: string, Icon: typeof List) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors",
        active === key ? "bg-brand-600 text-white" : "text-muted hover:text-ink",
      )}
    >
      <Icon className="size-4" aria-hidden /> {label}
    </Link>
  );
  return (
    <div className="inline-flex self-start rounded-xl border border-line bg-white p-1">
      {item("list", `/prices${suffix}`, t("prices.viewList"), List)}
      {item("map", `/map${suffix}`, t("prices.viewMap"), Map)}
    </div>
  );
}
