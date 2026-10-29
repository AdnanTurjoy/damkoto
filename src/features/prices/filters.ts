import { isUnitCode, type BaseUnit, type UnitCode } from "./units";
import { dhakaToday, shiftDate, toAsciiDigits } from "@/lib/utils";

export const PERIODS = ["any", "today", "7d", "30d", "90d", "custom"] as const;
export const SORTS = ["recent", "oldest", "unit_asc", "unit_desc", "discussed", "sample"] as const;
const BASE_UNITS: BaseUnit[] = ["kg", "l", "piece", "m", "packet", "sack", "cylinder", "bhori", "set", "other"];

export type Period = (typeof PERIODS)[number];
export type SortOption = (typeof SORTS)[number];

export interface PriceFilters {
  q?: string;
  category?: string;
  brand?: string;
  variant?: string;
  unit?: UnitCode;
  base?: BaseUnit;
  condition?: "new" | "used";
  division?: number;
  district?: number;
  upazila?: number;
  locality?: string;
  market?: string;
  minPrice?: number;
  maxPrice?: number;
  period: Period;
  from?: string;
  to?: string;
  sort: SortOption;
  hasImage?: boolean;
  hasComments?: boolean;
  named?: boolean;
  hasMarket?: boolean;
  /** Visible map area: [west, south, east, north]. */
  bbox?: [number, number, number, number];
  /** Distance filter around a point. */
  near?: { lat: number; lng: number; km: number };
  /** Exact comparison group (used by compare → reports links). */
  product?: string;
  page: number;
}

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

function getter(params: RawParams) {
  return (key: string): string | undefined => {
    const raw = params instanceof URLSearchParams ? params.get(key) : params[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };
}

const text = (v: string | undefined, max = 100) => (v ? v.slice(0, max) : undefined);
const num = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(toAsciiDigits(v));
  return Number.isFinite(n) ? n : undefined;
};
const posInt = (v: string | undefined) => {
  const n = num(v);
  return n !== undefined && Number.isInteger(n) && n > 0 ? n : undefined;
};
const isoDate = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined);
const flag = (v: string | undefined) => (v === "1" || v === "true" ? true : undefined);

/** Parses untrusted query parameters into a safe, typed filter object. */
export function parsePriceFilters(params: RawParams): PriceFilters {
  const get = getter(params);
  const unit = get("unit");
  const base = get("base");
  const condition = get("condition");
  const period = get("period");
  const sort = get("sort");
  const filters: PriceFilters = {
    q: text(get("q"), 80),
    category: text(get("category"), 60),
    brand: text(get("brand"), 60),
    variant: text(get("variant"), 80),
    unit: isUnitCode(unit) ? unit : undefined,
    base: BASE_UNITS.includes(base as BaseUnit) ? (base as BaseUnit) : undefined,
    condition: condition === "new" || condition === "used" ? condition : undefined,
    division: posInt(get("division")),
    district: posInt(get("district")),
    upazila: posInt(get("upazila")),
    locality: text(get("locality")),
    market: text(get("market")),
    minPrice: num(get("minPrice")),
    maxPrice: num(get("maxPrice")),
    period: (PERIODS as readonly string[]).includes(period ?? "") ? (period as Period) : "any",
    from: isoDate(get("from")),
    to: isoDate(get("to")),
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as SortOption) : "recent",
    hasImage: flag(get("hasImage")),
    hasComments: flag(get("hasComments")),
    named: flag(get("named")),
    hasMarket: flag(get("hasMarket")),
    product: text(get("product"), 120),
    page: Math.min(posInt(get("page")) ?? 1, 500),
  };

  if (filters.minPrice !== undefined && filters.minPrice < 0) filters.minPrice = undefined;
  if (filters.maxPrice !== undefined && filters.maxPrice < 0) filters.maxPrice = undefined;

  const bbox = get("bbox")?.split(",").map(Number);
  if (bbox && bbox.length === 4 && bbox.every(Number.isFinite)) {
    const [w, s, e, n] = bbox;
    if (w < e && s < n && Math.abs(w) <= 180 && Math.abs(e) <= 180 && Math.abs(s) <= 90 && Math.abs(n) <= 90) {
      filters.bbox = [w, s, e, n];
    }
  }

  const lat = num(get("lat"));
  const lng = num(get("lng"));
  const km = num(get("km"));
  if (lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    filters.near = { lat, lng, km: Math.min(Math.max(km ?? 5, 1), 100) };
  }
  return filters;
}

/** Resolves the period / custom range into an inclusive date window. */
export function dateWindow(filters: Pick<PriceFilters, "period" | "from" | "to">, today = dhakaToday()) {
  switch (filters.period) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: shiftDate(today, -6), to: today };
    case "30d":
      return { from: shiftDate(today, -29), to: today };
    case "90d":
      return { from: shiftDate(today, -89), to: today };
    case "custom":
      return { from: filters.from, to: filters.to };
    default:
      return { from: undefined, to: undefined };
  }
}

const SERIAL_KEYS: (keyof PriceFilters)[] = [
  "q",
  "category",
  "brand",
  "variant",
  "unit",
  "base",
  "condition",
  "division",
  "district",
  "upazila",
  "locality",
  "market",
  "minPrice",
  "maxPrice",
  "period",
  "from",
  "to",
  "sort",
  "hasImage",
  "hasComments",
  "named",
  "hasMarket",
  "product",
  "page",
];

/** Serialises filters back to a query string, omitting defaults. */
export function filtersToSearchParams(filters: Partial<PriceFilters>): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of SERIAL_KEYS) {
    const value = filters[key];
    if (value === undefined || value === null || value === false || value === "") continue;
    if (key === "period" && value === "any") continue;
    if (key === "sort" && value === "recent") continue;
    if (key === "page" && value === 1) continue;
    if ((key === "from" || key === "to") && filters.period !== "custom") continue;
    params.set(key, value === true ? "1" : String(value));
  }
  if (filters.bbox) params.set("bbox", filters.bbox.map((n) => n.toFixed(4)).join(","));
  if (filters.near) {
    params.set("lat", filters.near.lat.toFixed(4));
    params.set("lng", filters.near.lng.toFixed(4));
    params.set("km", String(filters.near.km));
  }
  return params;
}

/** Keys considered "active" for chips and the clear-all action. */
export function activeFilterKeys(filters: PriceFilters): string[] {
  const keys: string[] = [];
  for (const key of SERIAL_KEYS) {
    if (key === "page" || key === "sort" || key === "from" || key === "to") continue;
    const value = filters[key];
    if (value === undefined || value === false || (key === "period" && value === "any")) continue;
    keys.push(key);
  }
  if (filters.near) keys.push("near");
  return keys;
}
