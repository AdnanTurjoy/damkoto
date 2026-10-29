import { ArrowRight, BarChart3, HandCoins, MapPinned, PenLine, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { Container, EmptyState } from "@/components/states";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCategoryTree } from "@/features/categories/queries";
import { LocalMarketPicker } from "@/features/locations/components/local-market-picker";
import { getDivisionsAndDistricts } from "@/features/locations/queries";
import { getMapData } from "@/features/map/queries";
import { PreviewMap } from "@/features/map/components/preview-map";
import { encodeSetId } from "@/features/prices/compare";
import { HeroSearch } from "@/features/prices/components/hero-search";
import { PriceReportCard } from "@/features/prices/components/price-report-card";
import { getFreshness, freshnessLabel } from "@/features/prices/freshness";
import { getHomeData } from "@/features/prices/home";
import { parsePriceFilters } from "@/features/prices/filters";
import { getDb } from "@/lib/db";
import { formatDate, formatNumber, formatTaka, localName, type Locale, type MessageKey, type Translate } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";
import { queryOptions } from "@/lib/server-context";

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const db = await getDb();
  const options = queryOptions();
  const [home, categories, { districts }, mapData] = await Promise.all([
    getHomeData(db, options),
    getCategoryTree(db),
    getDivisionsAndDistricts(db),
    getMapData(db, parsePriceFilters({ period: "90d" }), 6, options),
  ]);
  const hasData = home.stats.total > 0;
  const mapPoints = mapData.mode === "points" ? mapData.points.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.productName, approximate: p.approximate })) : [];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-ledger">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-amber-200/40 blur-3xl" />
        <Container className="relative grid gap-10 py-12 md:py-16 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800">
              <Users className="size-4" aria-hidden /> {t("home.heroBadge")}
            </span>
            <h1 className="mt-4 text-[2.15rem] font-bold leading-tight tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">{t("home.heroTitle")}</h1>
            <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">{t("home.heroDesc")}</p>
            <div className="mt-7">
              <HeroSearch t={t} locale={locale} districts={districts} suggestions={home.catalogNames} />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/prices" className={buttonClasses("primary", "lg")}>
                <Search /> {t("home.ctaBrowse")}
              </Link>
              <Link href="/submit" className={buttonClasses("accent", "lg")}>
                <Plus /> {t("home.ctaSubmit")}
              </Link>
            </div>
          </div>
          <StatsLedger t={t} locale={locale} stats={home.stats} />
        </Container>
      </section>

      {/* Categories */}
      <Container className="py-14">
        <SectionHeading title={t("home.categoriesTitle")} subtitle={t("home.categoriesSubtitle")} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c, i) => (
            <li key={c.id}>
              <Link
                href={`/categories/${c.slug}`}
                className="group flex h-full items-center gap-3 rounded-2xl border border-line bg-white p-3.5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[var(--shadow-lift)] sm:p-4"
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${i < 6 ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700"}`}>
                  <CategoryIcon name={c.icon} className="size-6" />
                </span>
                <span className="text-[15px] font-bold leading-snug">{localName(locale, c)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      {/* Today's vegetables + local */}
      <section className="border-y border-line bg-white py-14">
        <Container className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div>
            <SectionHeading title={t("home.vegTitle")} subtitle={t("home.vegSubtitle")} href="/prices?category=vegetables&period=7d" viewAll={t("common.viewAll")} />
            {home.vegetables.length ? (
              <ReportRow reports={home.vegetables} />
            ) : (
              <EmptyState title={t("freshness.noRecent")} text={t("home.vegEmpty")} action={<SubmitButton t={t} />} />
            )}
          </div>
          <div>
            <SectionHeading title={t("home.localTitle")} subtitle={t("home.localSubtitle")} />
            <LocalMarketPicker districts={districts} />
          </div>
        </Container>
      </section>

      {/* Comparison + spread */}
      <Container className="grid gap-10 py-14 lg:grid-cols-2">
        <div>
          <SectionHeading title={t("home.compareTitle")} subtitle={t("home.compareSubtitle")} />
          <ComparisonPreview t={t} locale={locale} comparison={home.comparison} />
        </div>
        <div>
          <SectionHeading title={t("home.spreadTitle")} subtitle={t("home.spreadSubtitle")} />
          {home.spreads.length ? (
            <ul className="space-y-3">
              {home.spreads.map((s) => (
                <li key={`${s.productKey}-${s.baseUnit}-${s.variantKey}-${s.brandKey}`}>
                  <Link
                    href={`/compare?product=${encodeURIComponent(s.productKey)}&set=${encodeURIComponent(encodeSetId(s))}&period=30d`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4 hover:border-brand-200"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold">{s.catalogBn && s.catalogEn ? localName(locale, { nameBn: s.catalogBn, nameEn: s.catalogEn }) : s.name}</p>
                      <p className="text-sm text-muted">{t("home.spreadAcross", { count: s.count, areas: s.areas })}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold tabular-nums text-brand-700">
                        {t("home.spreadRange", { min: formatTaka(locale, s.min ?? 0), max: formatTaka(locale, s.max ?? 0) })}
                      </p>
                      <p className="text-xs text-muted">{t("common.perUnit", { unit: t(`units.${s.baseUnit}` as MessageKey) })}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<BarChart3 />} title={t("home.spreadTitle")} text={t("home.spreadEmpty")} />
          )}
        </div>
      </Container>

      {/* Map preview */}
      <section className="border-y border-line bg-white py-14">
        <Container className="grid items-center gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHeading title={t("home.mapTitle")} subtitle={t("home.mapSubtitle")} />
            <Link href="/map" className={buttonClasses("primary", "lg")}>
              <MapPinned /> {t("home.mapCta")}
            </Link>
          </div>
          <PreviewMap points={mapPoints} className="h-80 overflow-hidden rounded-2xl border border-line" />
        </Container>
      </section>

      {/* Recent */}
      <Container className="py-14">
        <SectionHeading title={t("home.recentTitle")} subtitle={t("home.recentSubtitle")} href="/prices" viewAll={t("common.viewAll")} />
        {hasData ? <ReportRow reports={home.recent} /> : <EmptyState title={t("home.emptyTitle")} text={t("home.emptyText")} action={<SubmitButton t={t} />} />}
      </Container>

      {/* How it works + community */}
      <Container className="pb-6">
        <div className="grid gap-6 rounded-3xl bg-brand-800 p-6 text-white sm:p-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <HandCoins className="size-10 text-amber-300" aria-hidden />
            <h2 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">{t("home.communityTitle")}</h2>
            <p className="mt-3 text-brand-100">{t("home.communityText")}</p>
            <Link href="/submit" className={buttonClasses("accent", "lg", "mt-6")}>
              <PenLine /> {t("home.communityCta")}
            </Link>
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-200">{t("home.howTitle")}</h3>
            <ol className="mt-4 space-y-4">
              {([1, 2, 3] as const).map((n) => (
                <li key={n} className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-300 font-bold text-ink">{formatNumber(locale, n)}</span>
                  <div>
                    <p className="font-bold">{t(`home.howStep${n}Title` as MessageKey)}</p>
                    <p className="text-sm text-brand-100">{t(`home.howStep${n}` as MessageKey)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </>
  );
}

function SectionHeading({ title, subtitle, href, viewAll }: { title: string; subtitle?: string; href?: string; viewAll?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {href && viewAll && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
          {viewAll} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function ReportRow({ reports }: { reports: Awaited<ReturnType<typeof getHomeData>>["recent"] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {reports.map((r) => (
        <li key={r.id}>
          <PriceReportCard report={r} />
        </li>
      ))}
    </ul>
  );
}

function SubmitButton({ t }: { t: Translate }) {
  return (
    <Link href="/submit" className={buttonClasses("accent")}>
      <Plus /> {t("nav.submit")}
    </Link>
  );
}

function StatsLedger({ t, locale, stats }: { t: Translate; locale: Locale; stats: { total: number; districts: number; week: number } }) {
  const rows = [
    { label: t("home.statReports"), value: stats.total },
    { label: t("home.statDistricts"), value: stats.districts },
    { label: t("home.statWeek"), value: stats.week },
  ];
  return (
    <Card className="relative rotate-1 p-6 sm:p-7">
      <div aria-hidden className="absolute -top-3 left-8 h-6 w-20 rotate-[-4deg] rounded-sm bg-amber-200/80" />
      <p className="text-sm font-semibold text-muted">{t("common.appName")}</p>
      <dl className="mt-4 divide-y divide-dashed divide-line">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-[15px] text-muted">{r.label}</dt>
            <dd className="text-3xl font-bold tabular-nums text-brand-700">{formatNumber(locale, r.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-muted">{t("common.communityReported")}</p>
    </Card>
  );
}

function ComparisonPreview({ t, locale, comparison }: { t: Translate; locale: Locale; comparison: Awaited<ReturnType<typeof getHomeData>>["comparison"] }) {
  if (!comparison || comparison.groups.length < 2) {
    // Clearly labelled illustration — never seeded or presented as real prices.
    const example = locale === "bn" ? [["মিরপুর, ঢাকা", "৳৩৫/কেজি"], ["উত্তরা, ঢাকা", "৳৩৮/কেজি"]] : [["Mirpur, Dhaka", "৳35/kg"], ["Uttara, Dhaka", "৳38/kg"]];
    return (
      <Card className="border-dashed p-5">
        <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-800">{t("home.exampleLabel")}</span>
        <p className="mt-3 font-bold">{t("home.exampleProduct")}</p>
        <table className="mt-2 w-full text-[15px]">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1.5 font-semibold">{t("home.exampleArea")}</th>
              <th className="py-1.5 text-right font-semibold">{t("home.examplePrice")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {example.map(([area, price]) => (
              <tr key={area} className="text-muted">
                <td className="py-2">{area}</td>
                <td className="py-2 text-right tabular-nums">{price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm text-muted">{t("home.exampleNote")}</p>
      </Card>
    );
  }
  const { product, groups } = comparison;
  return (
    <Card className="p-5">
      <p className="font-bold">
        {product.name} <span className="font-normal text-muted">· {t("compare.pricesPer", { per: t("common.perUnit", { unit: t(`units.${product.baseUnit}` as MessageKey) }) })}</span>
      </p>
      <table className="mt-3 w-full text-[15px]">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1.5 font-semibold">{t("compare.area")}</th>
            <th className="py-1.5 text-right font-semibold">{t("compare.median")}</th>
            <th className="py-1.5 text-right font-semibold">{t("compare.count")}</th>
            <th className="hidden py-1.5 text-right font-semibold sm:table-cell">{t("compare.latest")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {groups.map((g) => (
            <tr key={g.groupId}>
              <td className="py-2">{localName(locale, g)}</td>
              <td className="py-2 text-right font-bold tabular-nums text-brand-700">
                {formatTaka(locale, g.median)}
                {g.count === 1 && <span className="block text-[11px] font-normal text-muted">{t("compare.single")}</span>}
              </td>
              <td className="py-2 text-right tabular-nums">{formatNumber(locale, g.count)}</td>
              <td className="hidden py-2 text-right text-sm text-muted sm:table-cell">
                {formatDate(locale, g.latest)}
                <span className="block text-[11px]">{freshnessLabel(t, getFreshness(g.latest))}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Link
        href={`/compare?product=${encodeURIComponent(product.productKey)}&set=${encodeURIComponent(encodeSetId(product))}&period=30d`}
        className={buttonClasses("outline", "md", "mt-4 w-full")}
      >
        <BarChart3 /> {t("home.compareCta")}
      </Link>
    </Card>
  );
}
