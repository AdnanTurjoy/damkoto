import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/states";
import { siteConfig } from "@/config/site";
import { getCategoryTree } from "@/features/categories/queries";
import { getDivisionsAndDistricts } from "@/features/locations/queries";
import { getProductLabel } from "@/features/prices/compare";
import { ActiveFilterChips } from "@/features/prices/components/active-filter-chips";
import { PriceFilterPanel, SortSelect } from "@/features/prices/components/price-filter-panel";
import { ReportGrid } from "@/features/prices/components/report-grid";
import { ViewToggle } from "@/features/prices/components/view-toggle";
import { filtersToSearchParams, parsePriceFilters } from "@/features/prices/filters";
import { listReports } from "@/features/prices/queries";
import { getDb } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { queryOptions } from "@/lib/server-context";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("prices.title"), description: t("prices.metaDescription"), alternates: { canonical: "/prices" } };
}

export default async function PricesPage({ searchParams }: PageProps<"/prices">) {
  const { t, locale } = await getI18n();
  const filters = parsePriceFilters(await searchParams);
  const db = await getDb();
  const [data, categories, { divisions, districts }, productLabel] = await Promise.all([
    listReports(db, filters, { ...queryOptions(), pageSize: siteConfig.pageSize }),
    getCategoryTree(db),
    getDivisionsAndDistricts(db),
    filters.product ? getProductLabel(db, filters.product) : null,
  ]);
  const locations = new globalThis.Map([...divisions, ...districts].map((l) => [l.id, l]));
  const qs = filtersToSearchParams({ ...filters, page: 1 }).toString();
  const hrefFor = (page: number) => {
    const p = filtersToSearchParams({ ...filters, page }).toString();
    return p ? `/prices?${p}` : "/prices";
  };

  return (
    <Container>
      <PageHeader title={t("prices.title")} subtitle={t("prices.subtitle")}>
        <ViewToggle active="list" query={qs} t={t} />
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[17.5rem_1fr] lg:gap-8">
        <PriceFilterPanel categories={categories} divisions={divisions} districts={districts} resultCount={data.total} />
        <section aria-labelledby="results-heading" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" className="text-lg font-bold" aria-live="polite">
              {t("prices.results", { count: data.total })}
            </h2>
            <SortSelect />
          </div>
          <div className="mb-4">
            <ActiveFilterChips filters={filters} basePath="/prices" t={t} locale={locale} lookups={{ categories, locations, productLabel }} />
          </div>
          {(filters.sort === "unit_asc" || filters.sort === "unit_desc") && (
            <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{t("filters.sortNote")}</p>
          )}
          <ReportGrid data={data} t={t} hrefFor={hrefFor} />
          <p className="mt-8 text-center text-xs text-muted">{t("common.communityReported")}</p>
        </section>
      </div>
    </Container>
  );
}
