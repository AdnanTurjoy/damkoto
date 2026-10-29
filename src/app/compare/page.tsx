import { BarChart3, Info, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container, EmptyState, PageHeader } from "@/components/states";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { GROUP_BY } from "@/features/prices/compare";
import { loadComparison } from "@/features/prices/compare-page";
import { TrendChart } from "@/features/prices/components/trend-chart";
import { freshnessLabel, getFreshness } from "@/features/prices/freshness";
import { getDb } from "@/lib/db";
import { formatDate, formatNumber, formatTaka, localName, type MessageKey } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("compare.title"), description: t("compare.metaDescription"), alternates: { canonical: "/compare" } };
}

const PERIOD_OPTIONS = ["7d", "30d", "90d", "any"] as const;

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const { t, locale } = await getI18n();
  const params = await searchParams;
  const result = await loadComparison(await getDb(), params);
  const { product, sets, activeSet, groups, trend, trendGroups, groupBy, period } = result;
  const unitLabel = activeSet ? t(`units.${activeSet.baseUnit}` as MessageKey) : "";
  const per = t("common.perUnit", { unit: unitLabel });
  const globalMin = Math.min(...groups.map((g) => g.min));
  const globalMax = Math.max(...groups.map((g) => g.max));
  const span = globalMax - globalMin || 1;
  const hrefWith = (patch: Record<string, string>) => {
    const qs = new URLSearchParams({ ...(product ? { product: product.key } : {}), groupBy, period, ...(activeSet ? { set: activeSet.id } : {}), ...patch });
    return `/compare?${qs}`;
  };
  const series = [{ key: "overall", label: t("compare.overall") }, ...trendGroups.map((g) => ({ key: `g_${g.groupId}`, label: localName(locale, g) }))];
  const productName = product ? localName(locale, product) : "";

  return (
    <Container>
      <PageHeader title={t("compare.title")} subtitle={t("compare.subtitle")} />

      <Card className="p-4 sm:p-5">
        <form action="/compare" className="grid gap-3 sm:grid-cols-[1fr_12rem_10rem_auto] sm:items-end">
          <div>
            <Label htmlFor="cmp-q">{t("compare.productLabel")}</Label>
            <Input id="cmp-q" name="q" defaultValue={result.q ?? productName} placeholder={t("compare.productPlaceholder")} required />
          </div>
          <div>
            <Label htmlFor="cmp-group">{t("compare.groupBy")}</Label>
            <Select id="cmp-group" name="groupBy" defaultValue={groupBy}>
              {GROUP_BY.map((g) => (
                <option key={g} value={g}>
                  {t(`compare.groups.${g}`)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="cmp-period">{t("filters.period")}</Label>
            <Select id="cmp-period" name="period" defaultValue={period}>
              {PERIOD_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {t(`filters.periods.${p}`)}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="h-11">
            <Search /> {t("common.search")}
          </Button>
        </form>
      </Card>

      {!product ? (
        <EmptyState className="mt-8" icon={<BarChart3 />} title={t("compare.title")} text={t("compare.start")} />
      ) : !activeSet ? (
        <EmptyState className="mt-8" title={productName} text={t("compare.noData")} action={<Link href="/submit" className={buttonClasses("accent")}>{t("nav.submit")}</Link>} />
      ) : (
        <div className="mt-8 space-y-6">
          {sets.length > 1 && (
            <div>
              <p className="text-sm font-semibold">{t("compare.set")}</p>
              <p className="mb-2 text-sm text-muted">{t("compare.setHint")}</p>
              <div className="flex flex-wrap gap-2">
                {sets.map((s) => (
                  <Link
                    key={s.id}
                    href={hrefWith({ set: s.id })}
                    aria-current={s.id === activeSet.id ? "true" : undefined}
                    className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", s.id === activeSet.id ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white hover:border-brand-300")}
                  >
                    {t("compare.setLabel", {
                      unit: t("common.perUnit", { unit: t(`units.${s.baseUnit}` as MessageKey) }),
                      variant: s.variantLabel ? ` · ${s.variantLabel}` : "",
                      brand: s.brandLabel ? ` · ${s.brandLabel}` : "",
                      count: s.count,
                    })}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
              <h2 className="text-lg font-bold">
                {productName}
                {activeSet.variantLabel && <span className="font-normal text-muted"> · {activeSet.variantLabel}</span>}
                {activeSet.brandLabel && <span className="font-normal text-muted"> · {activeSet.brandLabel}</span>}
              </h2>
              <span className="text-sm text-muted">{t("compare.pricesPer", { per })}</span>
            </div>
            {groups.length === 0 ? (
              <p className="p-6 text-muted">{t("compare.noData")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-[15px]">
                  <thead className="bg-paper text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">{t("compare.area")}</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">{t("compare.count")}</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">{t("compare.min")}</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">{t("compare.median")}</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">{t("compare.avg")}</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">{t("compare.max")}</th>
                      <th scope="col" className="px-3 py-3 font-semibold">{t("compare.distribution")}</th>
                      <th scope="col" className="px-5 py-3 font-semibold">{t("compare.latest")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {groups.map((g) => {
                      const fresh = getFreshness(g.latest);
                      const single = g.count === 1;
                      return (
                        <tr key={g.groupId} className="align-top">
                          <th scope="row" className="px-5 py-3 text-left font-semibold">
                            {groupBy === "market" && !g.nameBn ? t("compare.unknownMarket") : localName(locale, g)}
                          </th>
                          <td className="px-3 py-3 text-right tabular-nums">{formatNumber(locale, g.count)}</td>
                          {single ? (
                            <td colSpan={4} className="px-3 py-3 text-right">
                              <Link href={`/prices/${g.singleReportId}`} className="font-bold tabular-nums text-brand-700 underline-offset-4 hover:underline">
                                {formatTaka(locale, g.median)}
                              </Link>
                              <span className="ml-2 rounded-full bg-paper-deep px-2 py-0.5 text-xs text-muted">{t("compare.single")}</span>
                            </td>
                          ) : (
                            <>
                              <td className="px-3 py-3 text-right tabular-nums">{formatTaka(locale, g.min)}</td>
                              <td className="px-3 py-3 text-right font-bold tabular-nums text-brand-700">{formatTaka(locale, g.median)}</td>
                              <td className="px-3 py-3 text-right tabular-nums">{formatTaka(locale, g.avg)}</td>
                              <td className="px-3 py-3 text-right tabular-nums">{formatTaka(locale, g.max)}</td>
                            </>
                          )}
                          <td className="px-3 py-3">
                            <div className="relative mt-2 h-2 w-36 rounded-full bg-paper-deep" aria-hidden>
                              <div className="absolute h-2 rounded-full bg-brand-200" style={{ left: `${((g.min - globalMin) / span) * 100}%`, width: `${Math.max(((g.max - g.min) / span) * 100, 2)}%` }} />
                              <div className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-white bg-brand-600" style={{ left: `${((g.median - globalMin) / span) * 100}%` }} />
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm">
                            {formatDate(locale, g.latest)}
                            <span className={cn("block text-xs", fresh.level === "stale" ? "text-amber-700" : "text-muted")}>{freshnessLabel(t, fresh)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold">{t("compare.trendTitle")}</h2>
            <p className="mb-3 text-sm text-muted">{t("compare.pricesPer", { per })}</p>
            {trend.length >= 2 ? <TrendChart data={trend} series={series} unitLabel={unitLabel} /> : <p className="rounded-xl bg-paper px-4 py-6 text-center text-muted">{t("compare.trendInsufficient")}</p>}
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <ul className="space-y-1 text-sm text-muted">
              <li className="flex gap-2"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />{t("compare.note1")}</li>
              <li className="flex gap-2"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />{t("compare.note2")}</li>
            </ul>
            <Link href={`/prices?product=${encodeURIComponent(product.key)}&base=${activeSet.baseUnit}&period=${period === "any" ? "" : period}`} className={buttonClasses("outline")}>
              {t("compare.seeReports")}
            </Link>
          </div>
        </div>
      )}
    </Container>
  );
}
