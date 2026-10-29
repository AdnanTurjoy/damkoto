import { siteConfig } from "@/config/site";
import type { MessageKey, Translate } from "@/lib/i18n/core";
import { daysBetween, dhakaToday } from "@/lib/utils";

export type FreshnessLevel = "today" | "recent" | "stale";

export interface Freshness {
  level: FreshnessLevel;
  days: number;
}

/** Freshness is based on the report (purchase) date, not record creation. */
export function getFreshness(reportDate: string, today = dhakaToday()): Freshness {
  const days = Math.max(0, daysBetween(reportDate, today));
  if (days === 0) return { level: "today", days };
  if (days > siteConfig.staleAfterDays) return { level: "stale", days };
  return { level: "recent", days };
}

export function freshnessLabel(t: Translate, freshness: Freshness): string {
  if (freshness.level === "today") return t("freshness.today");
  if (freshness.days === 1) return t("freshness.yesterday");
  const relative = t("freshness.daysAgo", { days: freshness.days });
  return freshness.level === "stale" ? `${relative} · ${t("freshness.stale")}` : relative;
}

export function unitLabelKey(unit: string): MessageKey {
  return `units.${unit}` as MessageKey;
}
