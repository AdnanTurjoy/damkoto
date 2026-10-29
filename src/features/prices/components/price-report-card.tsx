"use client";

import { Clock, MapPin, MessageCircle, Store, User } from "lucide-react";
import Link from "next/link";
import { ReportImage } from "@/components/report-image";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/client";
import { formatTaka, localName } from "@/lib/i18n/core";
import { cn } from "@/lib/utils";
import { comparableLine, formatQuantity, placeLabel } from "../format";
import { freshnessLabel, getFreshness } from "../freshness";
import type { ReportSummary } from "../queries";

export type ReportCardData = Pick<
  ReportSummary,
  | "id"
  | "productName"
  | "brand"
  | "variant"
  | "price"
  | "quantity"
  | "unit"
  | "baseUnit"
  | "unitPrice"
  | "reportDate"
  | "displayName"
  | "imageUrl"
  | "marketName"
  | "locality"
  | "commentCount"
  | "isDemo"
  | "categoryIcon"
  | "categoryNameBn"
  | "categoryNameEn"
  | "districtNameBn"
  | "districtNameEn"
  | "upazilaNameBn"
  | "upazilaNameEn"
>;

export function PriceReportCard({
  report,
  compact = false,
  highlighted = false,
  onHover,
}: {
  report: ReportCardData;
  compact?: boolean;
  highlighted?: boolean;
  onHover?: (id: string | null) => void;
}) {
  const { locale, t } = useI18n();
  const freshness = getFreshness(report.reportDate);
  const comparable = comparableLine(locale, t, report);
  const detail = [report.brand, report.variant].filter(Boolean).join(" · ");

  return (
    <article
      onMouseEnter={onHover ? () => onHover(report.id) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
      className={cn(
        "group relative flex gap-3 rounded-2xl border bg-white p-3 shadow-[var(--shadow-card)] transition-[box-shadow,border-color] hover:border-brand-200 hover:shadow-[var(--shadow-lift)]",
        highlighted ? "border-amber-400 ring-2 ring-amber-200" : "border-line",
        !compact && "sm:flex-col sm:p-0",
      )}
    >
      <ReportImage
        url={report.imageUrl}
        alt={report.productName}
        icon={report.categoryIcon}
        className={cn("size-20 shrink-0 rounded-xl", !compact && "sm:aspect-[16/10] sm:size-auto sm:w-full sm:rounded-b-none sm:rounded-t-2xl")}
      />
      <div className={cn("flex min-w-0 flex-1 flex-col", !compact && "sm:px-4 sm:pb-4")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold leading-snug">
              <Link href={`/prices/${report.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
                {report.productName}
              </Link>
            </h3>
            <p className="truncate text-[13px] text-muted">{detail || localName(locale, { nameBn: report.categoryNameBn, nameEn: report.categoryNameEn })}</p>
          </div>
          {report.isDemo && (
            <Badge tone="sky" title={t("common.demoHint")} className="shrink-0">
              {t("common.demo")}
            </Badge>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="price-tag">
            <span className="text-xl font-bold tabular-nums">{formatTaka(locale, report.price)}</span>
            <span className="text-[13px] font-medium text-muted">/ {formatQuantity(locale, t, report.quantity, report.unit)}</span>
          </span>
          {comparable && <span className="text-[13px] font-medium text-brand-700">{comparable}</span>}
        </div>

        <ul className="mt-2.5 space-y-1 text-[13px] text-muted">
          <li className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{placeLabel(locale, report)}</span>
          </li>
          {report.marketName && !compact && (
            <li className="flex items-center gap-1.5">
              <Store className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{report.marketName}</span>
            </li>
          )}
          <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={cn("flex items-center gap-1.5", freshness.level === "stale" && "text-amber-700")}>
              <Clock className="size-3.5 shrink-0" aria-hidden />
              {freshnessLabel(t, freshness)}
            </span>
            {report.commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="size-3.5" aria-hidden />
                {t("comments.count", { count: report.commentCount })}
              </span>
            )}
            {!compact && (
              <span className="flex min-w-0 items-center gap-1">
                <User className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{report.displayName ?? t("common.anonymous")}</span>
              </span>
            )}
          </li>
        </ul>
      </div>
    </article>
  );
}
