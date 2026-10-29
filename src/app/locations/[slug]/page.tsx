import { MapPinned, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/states";
import { buttonClasses } from "@/components/ui/button";
import { getDivisionsAndDistricts, getLocationById, getLocationBySlug } from "@/features/locations/queries";
import { ReportGrid } from "@/features/prices/components/report-grid";
import { parsePriceFilters, type PriceFilters } from "@/features/prices/filters";
import { listReports } from "@/features/prices/queries";
import { getDb } from "@/lib/db";
import { localName } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";
import { queryOptions } from "@/lib/server-context";

export async function generateMetadata({ params }: PageProps<"/locations/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { t, locale } = await getI18n();
  const location = await getLocationBySlug(await getDb(), slug);
  if (!location) return { title: t("errors.notFoundTitle") };
  return { title: `${localName(locale, location)} — ${t("nav.prices")}`, description: t("prices.metaDescription"), alternates: { canonical: `/locations/${slug}` } };
}

export default async function LocationPage({ params, searchParams }: PageProps<"/locations/[slug]">) {
  const { slug } = await params;
  const { t, locale } = await getI18n();
  const db = await getDb();
  const location = await getLocationBySlug(db, slug);
  if (!location) notFound();
  const key: keyof PriceFilters = location.level === "division" ? "division" : location.level === "district" ? "district" : "upazila";
  const filters = { ...parsePriceFilters(await searchParams), [key]: location.id };
  const [data, parent, { districts }] = await Promise.all([
    listReports(db, filters, queryOptions()),
    location.parentId ? getLocationById(db, location.parentId) : null,
    getDivisionsAndDistricts(db),
  ]);
  const children = location.level === "division" ? districts.filter((d) => d.parentId === location.id) : [];
  const hrefFor = (page: number) => (page > 1 ? `/locations/${slug}?page=${page}` : `/locations/${slug}`);

  return (
    <Container>
      <div className="flex flex-col gap-4 pb-6 pt-8 md:flex-row md:items-end md:justify-between md:pt-10">
        <div>
          {parent && (
            <Link href={`/locations/${parent.slug}`} className="text-sm font-semibold text-brand-700 hover:underline">
              {localName(locale, parent)}
            </Link>
          )}
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{localName(locale, location)}</h1>
          <p className="text-muted">{t("prices.results", { count: data.total })}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/map?${key}=${location.id}`} className={buttonClasses("outline")}>
            <MapPinned /> {t("nav.map")}
          </Link>
          <Link href={`/prices?${key}=${location.id}`} className={buttonClasses("outline")}>
            <SlidersHorizontal /> {t("filters.title")}
          </Link>
        </div>
      </div>
      {children.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {children.map((d) => (
            <Link key={d.id} href={`/locations/${d.slug}`} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold hover:border-brand-300 hover:bg-brand-50">
              {localName(locale, d)}
            </Link>
          ))}
        </div>
      )}
      <ReportGrid data={data} t={t} hrefFor={hrefFor} columns="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
    </Container>
  );
}
