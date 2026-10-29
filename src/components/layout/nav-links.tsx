"use client";

import { BarChart3, Home, List, Map, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export function DesktopNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const items = [
    { href: "/prices", label: t("nav.prices") },
    { href: "/map", label: t("nav.map") },
    { href: "/compare", label: t("nav.compare") },
    { href: "/how-it-works", label: t("nav.howItWorks") },
  ];
  return (
    <nav aria-label={t("nav.primary")} className="hidden items-center gap-1 lg:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-2 text-[15px] font-semibold transition-colors",
            isActive(pathname, item.href) ? "bg-brand-50 text-brand-800" : "text-muted hover:text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Thumb-reachable bottom bar on phones with a prominent “add price” action. */
export function MobileTabBar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const items = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/prices", label: t("nav.prices"), icon: List },
    { href: "/submit", label: t("nav.submit"), icon: Plus, primary: true },
    { href: "/map", label: t("nav.map"), icon: Map },
    { href: "/compare", label: t("nav.compare"), icon: BarChart3 },
  ];
  return (
    <nav aria-label={t("nav.primary")} className="fixed inset-x-0 bottom-0 z-[900] border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ href, label, icon: Icon, primary }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
                isActive(pathname, href) ? "text-brand-700" : "text-muted",
              )}
            >
              {primary ? (
                <span className="-mt-5 grid size-12 place-items-center rounded-2xl bg-amber-400 text-ink shadow-[var(--shadow-lift)]">
                  <Icon className="size-6" />
                </span>
              ) : (
                <Icon className="size-5" />
              )}
              <span className="leading-tight">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
