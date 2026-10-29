import { describe, expect, it } from "vitest";
import { activeFilterKeys, dateWindow, filtersToSearchParams, parsePriceFilters } from "@/features/prices/filters";

describe("parsePriceFilters", () => {
  it("parses valid parameters and defaults", () => {
    const f = parsePriceFilters(new URLSearchParams("q=আলু&district=1001&minPrice=২০&sort=unit_asc&hasImage=1&period=7d"));
    expect(f).toMatchObject({ q: "আলু", district: 1001, minPrice: 20, sort: "unit_asc", hasImage: true, period: "7d", page: 1 });
  });
  it("drops invalid and hostile values", () => {
    const f = parsePriceFilters({ district: "1; drop table", sort: "evil", period: "forever", unit: "tola", page: "-3", minPrice: "-5", bbox: "1,2,3" });
    expect(f.district).toBeUndefined();
    expect(f.sort).toBe("recent");
    expect(f.period).toBe("any");
    expect(f.unit).toBeUndefined();
    expect(f.page).toBe(1);
    expect(f.minPrice).toBeUndefined();
    expect(f.bbox).toBeUndefined();
  });
  it("parses bbox and near", () => {
    const f = parsePriceFilters({ bbox: "88.5,21,92,26", lat: "23.8", lng: "90.4", km: "500" });
    expect(f.bbox).toEqual([88.5, 21, 92, 26]);
    expect(f.near).toEqual({ lat: 23.8, lng: 90.4, km: 100 });
  });
  it("round-trips through the query string, omitting defaults", () => {
    const f = parsePriceFilters({ q: "onion", category: "vegetables", sort: "recent", page: "2" });
    const qs = filtersToSearchParams(f).toString();
    expect(qs).toBe("q=onion&category=vegetables&page=2");
    expect(parsePriceFilters(new URLSearchParams(qs))).toMatchObject({ q: "onion", category: "vegetables", page: 2 });
  });
  it("lists active filter keys", () => {
    expect(activeFilterKeys(parsePriceFilters({ q: "x", period: "30d", sort: "oldest" }))).toEqual(["q", "period"]);
  });
});

describe("dateWindow", () => {
  it("computes inclusive windows relative to today", () => {
    expect(dateWindow({ period: "7d" }, "2026-10-29")).toEqual({ from: "2026-10-23", to: "2026-10-29" });
    expect(dateWindow({ period: "today" }, "2026-10-29")).toEqual({ from: "2026-10-29", to: "2026-10-29" });
    expect(dateWindow({ period: "custom", from: "2026-01-01", to: "2026-02-01" })).toEqual({ from: "2026-01-01", to: "2026-02-01" });
    expect(dateWindow({ period: "any" })).toEqual({ from: undefined, to: undefined });
  });
});
