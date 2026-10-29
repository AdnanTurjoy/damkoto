import { ExternalLink, Landmark, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container, EmptyState, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OFFICIAL_CATEGORIES } from "@/db/schema";
import { isOfficialStale, officialPriceText, officialUnitText } from "@/features/official-prices/format";
import { listOfficialPrices } from "@/features/official-prices/service";
import { getDb } from "@/lib/db";
import { formatDate, type MessageKey } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("official.title"), description: t("official.metaDescription"), alternates: { canonical: "/official-prices" } };
}

export default async function OfficialPricesPage({ searchParams }: PageProps<"/official-prices">) {
  const { t, locale } = await getI18n();
  const sp = await searchParams;
  const category = typeof sp.category === "string" && (OFFICIAL_CATEGORIES as readonly string[]).includes(sp.category) ? sp.category : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : undefined;
  const prices = await listOfficialPrices(await getDb(), { category, q: q || undefined });
  const groups = OFFICIAL_CATEGORIES.map((c) => ({ category: c, rows: prices.filter((p) => p.category === c) })).filter((g) => g.rows.length);
  const chip = (value: string | undefined, label: string) => {
    const params = new URLSearchParams({ ...(value ? { category: value } : {}), ...(q ? { q } : {}) }).toString();
    return (
      <Link
        key={value ?? "all"}
        href={params ? `/official-prices?${params}` : "/official-prices"}
        aria-current={category === value ? "true" : undefined}
        className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", category === value ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white hover:border-brand-300")}
      >
        {label}
      </Link>
    );
  };

  return (
    <Container>
      <PageHeader title={t("official.title")} subtitle={t("official.subtitle")} />
      <p className="mb-5 flex gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <Landmark className="mt-0.5 size-4 shrink-0" aria-hidden /> {t("official.disclaimer")}
      </p>
      <form action="/official-prices" role="search" className="mb-4 flex gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        <label htmlFor="official-q" className="sr-only">{t("official.searchPlaceholder")}</label>
        <Input id="official-q" name="q" type="search" defaultValue={q} placeholder={t("official.searchPlaceholder")} className="max-w-md" />
        <Button type="submit"><Search /> {t("common.search")}</Button>
      </form>
      <div className="mb-8 flex flex-wrap gap-2">
        {chip(undefined, t("official.allCategories"))}
        {OFFICIAL_CATEGORIES.map((c) => chip(c, t(`official.categories.${c}`)))}
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={<Landmark />} title={t("official.empty")} text={t("official.emptyText")} />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.category} aria-labelledby={`og-${g.category}`}>
              <h2 id={`og-${g.category}`} className="mb-3 text-xl font-bold">{t(`official.categories.${g.category}`)}</h2>
              <Card className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-[15px]">
                  <thead className="bg-paper text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">{t("official.item")}</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">{t("official.price")}</th>
                      <th scope="col" className="px-3 py-3 font-semibold">{t("official.area")}</th>
                      <th scope="col" className="px-3 py-3 font-semibold">{t("official.source")}</th>
                      <th scope="col" className="px-4 py-3 font-semibold">{t("official.date")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {g.rows.map((p) => {
                      const stale = isOfficialStale(p.effectiveDate);
                      return (
                        <tr key={p.id} className="align-top">
                          <th scope="row" className="px-4 py-3 text-left font-semibold">
                            {locale === "bn" ? p.itemBn : p.itemEn}
                            {p.productSlug && (
                              <Link href={`/compare?product=${encodeURIComponent(p.productSlug)}`} className="block text-xs font-normal text-brand-700 hover:underline">
                                {t("report.compareThis")}
                              </Link>
                            )}
                            {p.note && <span className="block text-xs font-normal text-muted">{p.note}</span>}
                          </th>
                          <td className="px-3 py-3 text-right">
                            <span className="font-bold tabular-nums text-brand-700">{officialPriceText(locale, p)}</span>
                            <span className="block text-xs text-muted">{officialUnitText(locale, t, p)}</span>
                          </td>
                          <td className="px-3 py-3">{p.area}</td>
                          <td className="px-3 py-3 text-sm">
                            {t(`official.sources.${p.source}` as MessageKey)}
                            {p.source === "BAJUS" && <span className="block text-xs text-muted">{t("official.nonGovNote")}</span>}
                            {p.sourceUrl && (
                              <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-brand-700 underline">
                                {t("official.viewSource")} <ExternalLink className="size-3" aria-hidden />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {formatDate(locale, p.effectiveDate)}
                            {stale && <span className="block text-xs font-medium text-amber-700">{t("official.old")}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
