import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import type { Translate } from "@/lib/i18n/core";
import { cn } from "@/lib/utils";

export function Pagination({ page, pageCount, hrefFor, t }: { page: number; pageCount: number; hrefFor: (page: number) => string; t: Translate }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label={t("common.page", { page, total: pageCount })} className="mt-8 flex items-center justify-between gap-3">
      <PageLink disabled={page <= 1} href={hrefFor(page - 1)} rel="prev">
        <ChevronLeft /> {t("common.previous")}
      </PageLink>
      <span className="text-sm font-medium text-muted">{t("common.page", { page, total: pageCount })}</span>
      <PageLink disabled={page >= pageCount} href={hrefFor(page + 1)} rel="next">
        {t("common.next")} <ChevronRight />
      </PageLink>
    </nav>
  );
}

function PageLink({ disabled, href, rel, children }: { disabled: boolean; href: string; rel: string; children: React.ReactNode }) {
  if (disabled) return <span aria-disabled className={cn(buttonClasses("outline", "md"), "pointer-events-none opacity-45")}>{children}</span>;
  return (
    <Link href={href} rel={rel} className={buttonClasses("outline", "md")}>
      {children}
    </Link>
  );
}
