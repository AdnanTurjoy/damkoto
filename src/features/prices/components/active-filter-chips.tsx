import { X } from "lucide-react";
import Link from "next/link";
import { formatDate, localName, type Locale, type MessageKey, type Translate } from "@/lib/i18n/core";
import type { CategoryNode } from "@/features/categories/queries";
import { activeFilterKeys, filtersToSearchParams, type PriceFilters } from "../filters";

interface Lookups {
  categories: CategoryNode[];
  locations: Map<number, { nameBn: string; nameEn: string }>;
  productLabel?: { nameBn: string; nameEn: string } | null;
}

/** Server-rendered chips; each removes one filter via a plain link. */
export function ActiveFilterChips({ filters, basePath, t, locale, lookups }: { filters: PriceFilters; basePath: string; t: Translate; locale: Locale; lookups: Lookups }) {
  const keys = activeFilterKeys(filters);
  if (!keys.length) return null;

  const allCategories = lookups.categories.flatMap((c) => [c, ...c.children]);
  const loc = (id?: number) => {
    const l = id ? lookups.locations.get(id) : undefined;
    return l ? localName(locale, l) : String(id);
  };

  const label = (key: string): string => {
    switch (key) {
      case "category": {
        const c = allCategories.find((x) => x.slug === filters.category);
        return c ? localName(locale, c) : String(filters.category);
      }
      case "division":
        return loc(filters.division);
      case "district":
        return loc(filters.district);
      case "upazila":
        return loc(filters.upazila);
      case "unit":
        return `${t("filters.unit")}: ${t(`units.${filters.unit}` as MessageKey)}`;
      case "base":
        return t("common.perUnit", { unit: t(`units.${filters.base}` as MessageKey) });
      case "condition":
        return t(`conditions.${filters.condition}` as MessageKey);
      case "period":
        return filters.period === "custom"
          ? [filters.from && formatDate(locale, filters.from), filters.to && formatDate(locale, filters.to)].filter(Boolean).join(" – ") || t("filters.periods.custom")
          : t(`filters.periods.${filters.period}` as MessageKey);
      case "minPrice":
        return `${t("filters.priceMin")}: ৳${filters.minPrice}`;
      case "maxPrice":
        return `${t("filters.priceMax")}: ৳${filters.maxPrice}`;
      case "hasImage":
      case "hasComments":
      case "named":
      case "hasMarket":
        return t(`filters.${key}` as MessageKey);
      case "near":
        return t("filters.radius", { km: filters.near?.km ?? 0 });
      case "product":
        return lookups.productLabel ? localName(locale, lookups.productLabel) : String(filters.product);
      default:
        return `“${String(filters[key as keyof PriceFilters])}”`;
    }
  };

  const without = (key: string) => {
    const next: Partial<PriceFilters> = { ...filters, page: 1 };
    if (key === "near") delete next.near;
    else if (key === "division") Object.assign(next, { division: undefined, district: undefined, upazila: undefined });
    else if (key === "district") Object.assign(next, { district: undefined, upazila: undefined });
    else if (key === "period") Object.assign(next, { period: "any", from: undefined, to: undefined });
    else (next as Record<string, unknown>)[key] = undefined;
    const qs = filtersToSearchParams(next).toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const sortOnly = filters.sort !== "recent" ? `?sort=${filters.sort}` : "";

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t("filters.active")}>
      {keys.map((key) => {
        const text = label(key);
        return (
          <Link
            key={key}
            href={without(key)}
            scroll={false}
            aria-label={t("filters.remove", { label: text })}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-brand-600 py-1 pl-3 pr-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {text}
            <X className="size-3.5" aria-hidden />
          </Link>
        );
      })}
      <Link href={`${basePath}${sortOnly}`} scroll={false} className="px-1 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline">
        {t("filters.clearAll")}
      </Link>
    </div>
  );
}
