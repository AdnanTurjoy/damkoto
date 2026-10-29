"use client";

import { FileText, Flag, FolderTree, Landmark, LayoutDashboard, MessageSquare, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const items = [
    { href: "/admin", label: t("admin.nav.dashboard"), icon: LayoutDashboard },
    { href: "/admin/reports", label: t("admin.nav.reports"), icon: FileText },
    { href: "/admin/comments", label: t("admin.nav.comments"), icon: MessageSquare },
    { href: "/admin/content-reports", label: t("admin.nav.contentReports"), icon: Flag },
    { href: "/admin/categories", label: t("admin.nav.categories"), icon: FolderTree },
    { href: "/admin/official-prices", label: t("admin.nav.official"), icon: Landmark },
    { href: "/admin/settings", label: t("admin.nav.settings"), icon: Settings },
  ];
  return (
    <nav aria-label={t("admin.title")} className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold", active ? "bg-brand-600 text-white" : "text-muted hover:bg-white hover:text-ink")}>
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
