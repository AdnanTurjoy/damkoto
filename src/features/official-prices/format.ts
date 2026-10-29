import { formatNumber, formatTaka, type Locale, type MessageKey, type Translate } from "@/lib/i18n/core";
import { daysBetween, dhakaToday } from "@/lib/utils";
import type { OfficialPrice } from "./service";

/** A list older than this is marked as possibly outdated. */
export const OFFICIAL_STALE_DAYS = 30;

export function officialUnitText(locale: Locale, t: Translate, p: Pick<OfficialPrice, "quantity" | "unit" | "unitLabel">): string {
  if (p.unitLabel) return p.unitLabel;
  const unit = t(`units.${p.unit}` as MessageKey);
  return p.quantity === 1 ? t("common.perUnit", { unit }) : `${formatNumber(locale, p.quantity, 3)} ${unit}`;
}

/** "৳৪০–৪৫" or "৳১,৪৫০" */
export function officialPriceText(locale: Locale, p: Pick<OfficialPrice, "priceMin" | "priceMax">): string {
  return p.priceMax !== null && p.priceMax !== p.priceMin ? `${formatTaka(locale, p.priceMin)}–${formatTaka(locale, p.priceMax).slice(1)}` : formatTaka(locale, p.priceMin);
}

export function isOfficialStale(effectiveDate: string, today = dhakaToday()): boolean {
  return daysBetween(effectiveDate, today) > OFFICIAL_STALE_DAYS;
}
