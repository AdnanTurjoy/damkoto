import type { Database } from "@/lib/db/client";
import { env } from "@/config/env";
import { officialPricesForProduct } from "@/features/official-prices/service";
import { dateWindow, PERIODS, type Period } from "./filters";
import {
  compareGroups,
  compareTrend,
  decodeSetId,
  getComparisonSets,
  getProductLabel,
  GROUP_BY,
  resolveProductKey,
  type GroupBy,
} from "./compare";

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function read(params: Params, key: string): string | undefined {
  const raw = params instanceof URLSearchParams ? params.get(key) : params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

/** Everything the compare page and /api/prices/compare need, from query params. */
export async function loadComparison(db: Database, params: Params) {
  const options = { showDemo: env.showDemoData };
  const groupByParam = read(params, "groupBy");
  const groupBy: GroupBy = (GROUP_BY as readonly string[]).includes(groupByParam ?? "") ? (groupByParam as GroupBy) : "district";
  const periodParam = read(params, "period");
  const period: Period =
    periodParam && (PERIODS as readonly string[]).includes(periodParam) && periodParam !== "custom" && periodParam !== "today"
      ? (periodParam as Period)
      : "90d";
  const window = dateWindow({ period });

  const productKey = read(params, "product")?.slice(0, 120);
  const q = read(params, "q")?.slice(0, 80);
  let product: { key: string; nameBn: string; nameEn: string } | null = null;
  if (productKey) {
    const label = await getProductLabel(db, productKey);
    product = label ? { key: productKey, ...label } : null;
  } else if (q) {
    product = await resolveProductKey(db, q);
  }

  if (!product) return { product: null, q, groupBy, period, sets: [], activeSet: null, groups: [], trend: [], trendGroups: [], official: [] };

  const sets = await getComparisonSets(db, product.key, window, options);
  const requested = decodeSetId(read(params, "set"));
  const activeSet = sets.find((s) => requested && s.baseUnit === requested.baseUnit && s.variantKey === requested.variantKey && s.brandKey === requested.brandKey) ?? sets[0] ?? null;
  if (!activeSet) return { product, q, groupBy, period, sets, activeSet: null, groups: [], trend: [], trendGroups: [], official: await officialPricesForProduct(db, product.key) };

  const groups = await compareGroups(db, { productKey: product.key, set: activeSet, groupBy, window }, options);
  const trendGroups = groups.filter((g) => g.count >= 2).slice(0, 3);
  const trend = await compareTrend(
    db,
    { productKey: product.key, set: activeSet, groupBy, window, groupIds: trendGroups.map((g) => g.groupId) },
    options,
  );
  const official = await officialPricesForProduct(db, product.key, activeSet.baseUnit);
  return { product, q, groupBy, period, sets, activeSet, groups, trend, trendGroups, official };
}

export type ComparisonResult = Awaited<ReturnType<typeof loadComparison>>;
