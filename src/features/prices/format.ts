import { formatNumber, formatTaka, localName, type Locale, type Translate } from "@/lib/i18n/core";
import { unitLabelKey } from "./freshness";
import { isConvertibleBase, type BaseUnit } from "./units";

export function formatQuantity(locale: Locale, t: Translate, quantity: number, unit: string): string {
  return `${formatNumber(locale, quantity, 3)} ${t(unitLabelKey(unit))}`;
}

/** "৳৪৫ / ১ কেজি" */
export function formatReportedPrice(locale: Locale, t: Translate, price: number, quantity: number, unit: string): string {
  return `${formatTaka(locale, price)} / ${formatQuantity(locale, t, quantity, unit)}`;
}

/**
 * Comparable price line ("≈ ৳৯০/কেজি"), shown only when it adds information:
 * a convertible unit and a package that isn't already one base unit.
 */
export function comparableLine(
  locale: Locale,
  t: Translate,
  r: { unitPrice: number | null; baseUnit: string | null; quantity: number; unit: string },
): string | null {
  if (r.unitPrice === null || !r.baseUnit || !isConvertibleBase(r.baseUnit as BaseUnit)) return null;
  if (r.quantity === 1 && r.unit === r.baseUnit) return null;
  return t("prices.unitPriceShort", { price: formatTaka(locale, r.unitPrice), unit: t(unitLabelKey(r.baseUnit)) });
}

export function placeLabel(
  locale: Locale,
  r: { locality: string | null; upazilaNameBn: string | null; upazilaNameEn: string | null; districtNameBn: string; districtNameEn: string },
): string {
  const upazila = r.upazilaNameBn && r.upazilaNameEn ? localName(locale, { nameBn: r.upazilaNameBn, nameEn: r.upazilaNameEn }) : null;
  const district = localName(locale, { nameBn: r.districtNameBn, nameEn: r.districtNameEn });
  return [r.locality, upazila, district].filter(Boolean).join(", ");
}
