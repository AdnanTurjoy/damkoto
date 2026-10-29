import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageHeader } from "@/components/states";
import { getCategoryTree } from "@/features/categories/queries";
import { getDivisionsAndDistricts } from "@/features/locations/queries";
import { MapExplorer } from "@/features/map/components/map-explorer";
import { ActiveFilterChips } from "@/features/prices/components/active-filter-chips";
import { PriceFilterPanel } from "@/features/prices/components/price-filter-panel";
import { ViewToggle } from "@/features/prices/components/view-toggle";
import { filtersToSearchParams, parsePriceFilters } from "@/features/prices/filters";
import { getDb } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("map.title"), description: t("map.metaDescription"), alternates: { canonical: "/map" } };
}

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const { t, locale } = await getI18n();
  const filters = parsePriceFilters(await searchParams);
  const db = await getDb();
  const [categories, { divisions, districts }] = await Promise.all([getCategoryTree(db), getDivisionsAndDistricts(db)]);
  const locations = new Map([...divisions, ...districts].map((l) => [l.id, l]));
  const qs = filtersToSearchParams({ ...filters, page: 1 }).toString();

  return (
    <Container>
      <PageHeader title={t("map.title")} subtitle={t("map.subtitle")}>
        <ViewToggle active="map" query={qs} t={t} />
      </PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <PriceFilterPanel categories={categories} divisions={divisions} districts={districts} alwaysSheet />
        <ActiveFilterChips filters={filters} basePath="/map" t={t} locale={locale} lookups={{ categories, locations }} />
      </div>
      <Suspense>
        <MapExplorer districts={districts} />
      </Suspense>
      <p className="mt-4 text-xs text-muted">
        {t("common.communityReported")} {t("submit.privacyNote")}
      </p>
    </Container>
  );
}
