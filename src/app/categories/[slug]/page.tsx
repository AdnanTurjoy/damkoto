import { SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryIcon } from "@/components/category-icon";
import { Container } from "@/components/states";
import { buttonClasses } from "@/components/ui/button";
import { getCategoryBySlug, getCategoryTree } from "@/features/categories/queries";
import { ReportGrid } from "@/features/prices/components/report-grid";
import { parsePriceFilters } from "@/features/prices/filters";
import { listReports } from "@/features/prices/queries";
import { getDb } from "@/lib/db";
import { localName } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";
import { queryOptions } from "@/lib/server-context";

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { t, locale } = await getI18n();
  const category = await getCategoryBySlug(await getDb(), slug);
  if (!category) return { title: t("errors.notFoundTitle") };
  return { title: localName(locale, category), description: t("prices.metaDescription"), alternates: { canonical: `/categories/${slug}` } };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const { t, locale } = await getI18n();
  const db = await getDb();
  const category = await getCategoryBySlug(db, slug);
  if (!category || !category.isActive) notFound();
  const sp = await searchParams;
  const filters = { ...parsePriceFilters(sp), category: slug };
  const [data, tree] = await Promise.all([listReports(db, filters, queryOptions()), getCategoryTree(db)]);
  const node = tree.flatMap((c) => [c, ...c.children]).find((c) => c.slug === slug);
  const parent = category.parentId ? tree.find((c) => c.id === category.parentId) : null;
  const hrefFor = (page: number) => (page > 1 ? `/categories/${slug}?page=${page}` : `/categories/${slug}`);

  return (
    <Container>
      <div className="flex flex-col gap-4 pb-6 pt-8 md:flex-row md:items-end md:justify-between md:pt-10">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <CategoryIcon name={category.icon} className="size-8" />
          </span>
          <div>
            {parent && (
              <Link href={`/categories/${parent.slug}`} className="text-sm font-semibold text-brand-700 hover:underline">
                {localName(locale, parent)}
              </Link>
            )}
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{localName(locale, category)}</h1>
            <p className="text-muted">{t("prices.results", { count: data.total })}</p>
          </div>
        </div>
        <Link href={`/prices?category=${slug}`} className={buttonClasses("outline")}>
          <SlidersHorizontal /> {t("filters.title")}
        </Link>
      </div>
      {node && node.children.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {node.children.map((c) => (
            <Link key={c.id} href={`/categories/${c.slug}`} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold hover:border-brand-300 hover:bg-brand-50">
              {localName(locale, c)}
            </Link>
          ))}
        </div>
      )}
      <ReportGrid data={data} t={t} hrefFor={hrefFor} columns="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
    </Container>
  );
}
