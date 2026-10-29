import { AlertTriangle, BarChart3, CalendarDays, Info, MapPin, Store, Tag, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ReportImage } from "@/components/report-image";
import { Container } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canModifyReport, isOwner, isStaff } from "@/features/auth/permissions";
import { CommentSection } from "@/features/comments/components/comment-section";
import { ReactionBar } from "@/features/comments/components/reaction-bar";
import { getReactions, listComments } from "@/features/comments/service";
import { OfficialPriceBox } from "@/features/official-prices/components/official-price-box";
import { officialPricesForProduct } from "@/features/official-prices/service";
import { getDivisionsAndDistricts } from "@/features/locations/queries";
import { PreviewMap } from "@/features/map/components/preview-map";
import { encodeSetId } from "@/features/prices/compare";
import { PriceReportCard } from "@/features/prices/components/price-report-card";
import { FlagReportButton, OwnerActions, ShareButton } from "@/features/prices/components/report-actions";
import { comparableLine, formatQuantity, placeLabel } from "@/features/prices/format";
import { freshnessLabel, getFreshness } from "@/features/prices/freshness";
import { getRelatedReports, getReportDetail } from "@/features/prices/queries";
import { cloudinaryUrl } from "@/lib/images";
import { getDb } from "@/lib/db";
import { formatDate, formatDateTime, formatTaka, localName, type MessageKey } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";
import { getActor, queryOptions } from "@/lib/server-context";
import { cn } from "@/lib/utils";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const loadReport = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;
  return getReportDetail(await getDb(), id);
});

function isPublic(report: NonNullable<Awaited<ReturnType<typeof loadReport>>>) {
  return report.status === "published" && (!report.isDemo || queryOptions().showDemo);
}

export async function generateMetadata({ params }: PageProps<"/prices/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { t, locale } = await getI18n();
  const report = await loadReport(id);
  if (!report || !isPublic(report)) return { title: t("report.notFoundTitle"), robots: { index: false } };
  const title = `${report.productName} — ${formatTaka(locale, report.price)} / ${formatQuantity(locale, t, report.quantity, report.unit)}`;
  const description = `${placeLabel(locale, report)} · ${formatDate(locale, report.reportDate)} · ${t("common.communityReported")}`;
  return {
    title,
    description,
    alternates: { canonical: `/prices/${report.id}` },
    robots: report.isDemo ? { index: false } : undefined,
    openGraph: { title, description, type: "article", images: report.imageUrl ? [{ url: cloudinaryUrl(report.imageUrl, 1200) }] : undefined },
  };
}

export default async function ReportPage({ params }: PageProps<"/prices/[id]">) {
  const { id } = await params;
  const report = await loadReport(id);
  if (!report) notFound();
  const actor = await getActor();
  const owned = { ownerHash: report.submitterHash, ownerId: report.contributorId, createdAt: report.createdAt, status: report.status };
  const viewerIsOwner = isOwner(owned, actor);
  if (!isPublic(report) && !viewerIsOwner && !isStaff(actor.viewer)) notFound();

  const { t, locale } = await getI18n();
  const db = await getDb();
  const [related, comments, reactions, { divisions, districts }, official] = await Promise.all([
    getRelatedReports(db, report, queryOptions()),
    report.status === "published" ? listComments(db, report.id, actor) : Promise.resolve({ comments: [], nextCursor: null }),
    getReactions(db, report.id, actor.clientHash),
    getDivisionsAndDistricts(db),
    officialPricesForProduct(db, report.productKey, report.baseUnit),
  ]);

  const freshness = getFreshness(report.reportDate);
  const comparable = comparableLine(locale, t, report);
  const category = localName(locale, { nameBn: report.categoryNameBn, nameEn: report.categoryNameEn });
  const parentCategory = report.parentCategoryNameBn && report.parentCategoryNameEn ? localName(locale, { nameBn: report.parentCategoryNameBn, nameEn: report.parentCategoryNameEn }) : null;
  const division = localName(locale, { nameBn: report.divisionNameBn, nameEn: report.divisionNameEn });
  const compareHref = `/compare?product=${encodeURIComponent(report.productKey)}&set=${encodeURIComponent(
    encodeSetId({ baseUnit: report.baseUnit ?? "", variantKey: report.variantKey, brandKey: (report.brand ?? "").trim().toLowerCase() }),
  )}`;

  const details: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
    { icon: <MapPin />, label: t("report.location"), value: `${placeLabel(locale, report)}, ${division}` },
    ...(report.marketName ? [{ icon: <Store />, label: t("report.market"), value: report.marketName }] : []),
    ...(report.brand ? [{ icon: <Tag />, label: t("report.brand"), value: report.brand }] : []),
    ...(report.variant ? [{ icon: <Tag />, label: t("report.variant"), value: report.variant }] : []),
    ...(report.packageDescription ? [{ icon: <Tag />, label: t("report.package"), value: report.packageDescription }] : []),
    ...(report.condition ? [{ icon: <Info />, label: t("report.condition"), value: t(`conditions.${report.condition}` as MessageKey) }] : []),
    {
      icon: <CalendarDays />,
      label: report.purchaseDate ? t("report.purchaseDate") : t("report.reportDate"),
      value: (
        <>
          {formatDate(locale, report.reportDate)}
          {!report.purchaseDate && <span className="block text-xs text-muted">{t("freshness.purchaseUnknown")}</span>}
        </>
      ),
    },
    { icon: <CalendarDays />, label: t("report.submittedAt"), value: formatDateTime(locale, report.createdAt) },
    { icon: <User />, label: t("report.contributor"), value: report.displayName ?? t("common.anonymous") },
  ];

  return (
    <Container className="pt-6">
      <nav aria-label="breadcrumb" className="mb-4 text-sm text-muted">
        <Link href="/prices" className="hover:text-ink">
          {t("nav.prices")}
        </Link>
        <span aria-hidden> / </span>
        <Link href={`/prices?category=${report.categorySlug}`} className="hover:text-ink">
          {parentCategory ? `${parentCategory} · ${category}` : category}
        </Link>
      </nav>

      {report.status !== "published" && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[15px] text-amber-700">
          <AlertTriangle className="size-5 shrink-0" />
          {report.status === "pending" ? t("report.pendingNotice") : t(`status.${report.status}` as MessageKey)}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <div className="grid md:grid-cols-[18rem_1fr]">
              <ReportImage url={report.imageUrl} alt={report.productName} icon={report.categoryIcon} className="aspect-[4/3] w-full md:aspect-auto md:h-full" sizes="(min-width: 768px) 288px, 100vw" />
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{category}</Badge>
                  <Badge tone={freshness.level === "stale" ? "amber" : "neutral"}>{freshnessLabel(t, freshness)}</Badge>
                  {report.isDemo && <Badge tone="sky">{t("common.demo")}</Badge>}
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{report.productName}</h1>
                <p className="mt-1 text-sm text-muted">{t("report.reportedPrice")}</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-3">
                  <span className="price-tag py-1.5 pl-7 pr-4">
                    <span className="text-3xl font-bold tabular-nums sm:text-4xl">{formatTaka(locale, report.price)}</span>
                    <span className="text-base font-medium text-muted">/ {formatQuantity(locale, t, report.quantity, report.unit)}</span>
                  </span>
                </div>
                <p className="mt-3 text-[15px]">
                  <span className="font-semibold">{t("report.unitPrice")}: </span>
                  {comparable ? <span className="text-brand-700">{comparable}</span> : report.unitPrice !== null && report.baseUnit === report.unit && report.quantity === 1 ? <span className="text-brand-700">{formatTaka(locale, report.unitPrice)} / {t(`units.${report.unit}` as MessageKey)}</span> : <span className="text-muted">{t("report.unitPriceNA")}</span>}
                </p>
                <p className="mt-3 flex gap-2 rounded-xl bg-paper px-3 py-2 text-sm text-muted">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {t("report.singleReport")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ShareButton title={report.productName} />
                  <Link href={compareHref} className={buttonClasses("outline", "sm")}>
                    <BarChart3 /> {t("report.compareThis")}
                  </Link>
                  {report.status === "published" && <FlagReportButton reportId={report.id} />}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-bold">{t("report.details")}</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {details.map((d) => (
                <div key={d.label} className="flex gap-3">
                  <span className="mt-0.5 text-brand-600 [&_svg]:size-4.5" aria-hidden>
                    {d.icon}
                  </span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{d.label}</dt>
                    <dd className="text-[15px]">{d.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
            {report.note && (
              <div className="mt-5 border-t border-line pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("report.note")}</h3>
                <p className="mt-1 whitespace-pre-line break-words text-[15px] leading-relaxed">{report.note}</p>
              </div>
            )}
          </Card>

          {report.status === "published" && (
            <Card className="p-5 sm:p-6">
              <ReactionBar reportId={report.id} initial={reactions} />
            </Card>
          )}

          {report.status === "published" && <CommentSection reportId={report.id} initial={comments} divisions={divisions} districts={districts} />}
        </div>

        <aside className="space-y-6">
          {canModifyReport(owned, actor) && <OwnerActions reportId={report.id} />}
          <OfficialPriceBox prices={official} t={t} locale={locale} />
          {report.lat != null && report.lng != null && (
            <Card className="overflow-hidden">
              <PreviewMap className="h-56" points={[{ id: report.id, lat: report.lat, lng: report.lng, label: report.productName, approximate: report.locationMethod === "admin" }]} center={[report.lat, report.lng]} zoom={report.locationMethod === "admin" ? 9 : 13} />
              <p className="px-4 py-3 text-xs text-muted">{report.locationMethod === "admin" ? t("report.districtCenter") : t("report.approxLocation")}</p>
            </Card>
          )}
          <RelatedList title={t("report.relatedTitle")} empty={t("report.relatedEmpty")} items={related.sameProduct} />
          <RelatedList title={t("report.nearbyTitle")} empty={t("report.nearbyEmpty")} items={related.nearby} />
        </aside>
      </div>
      <p className={cn("mt-10 rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-700")}>{t("common.communityReported")}</p>
    </Container>
  );
}

function RelatedList({ title, empty, items }: { title: string; empty: string; items: Awaited<ReturnType<typeof getRelatedReports>>["sameProduct"] }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-bold">{title}</h2>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id}>
              <PriceReportCard report={r} compact />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line px-4 py-5 text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}
