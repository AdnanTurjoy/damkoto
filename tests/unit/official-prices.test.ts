import { describe, expect, it } from "vitest";
import { createTranslator } from "@/lib/i18n/core";
import { isOfficialStale, officialPriceText, officialUnitText } from "@/features/official-prices/format";
import { csvToInputs, officialPriceInputSchema, parseCsv } from "@/features/official-prices/schema";

const base = { category: "essentials", source: "TCB", itemBn: "আলু", itemEn: "Potato", priceMin: "৪০", unit: "kg", area: "ঢাকা", effectiveDate: "2026-10-01" };

describe("official price input", () => {
  it("accepts a valid entry with Bengali digits and defaults", () => {
    const r = officialPriceInputSchema.parse(base);
    expect(r).toMatchObject({ priceMin: 40, quantity: 1, isActive: true });
  });
  it("rejects bad ranges, sources, future dates and non-http links", () => {
    expect(officialPriceInputSchema.safeParse({ ...base, priceMax: "30" }).success).toBe(false);
    expect(officialPriceInputSchema.safeParse({ ...base, source: "RANDOM" }).success).toBe(false);
    expect(officialPriceInputSchema.safeParse({ ...base, effectiveDate: "2999-01-01" }).success).toBe(false);
    expect(officialPriceInputSchema.safeParse({ ...base, sourceUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(officialPriceInputSchema.safeParse({ ...base, sourceUrl: "https://tcb.gov.bd/x" }).success).toBe(true);
  });
});

describe("CSV", () => {
  it("parses quotes, commas and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });
  it("maps headers to input fields with line numbers", () => {
    const rows = csvToInputs("category,source,item_bn,item_en,price_min,unit,area,effective_date\nessentials,TCB,আলু,Potato,40,kg,ঢাকা,2026-10-01\n");
    expect(rows).toEqual([{ line: 2, raw: expect.objectContaining({ itemBn: "আলু", priceMin: "40", effectiveDate: "2026-10-01" }) }]);
  });
  it("reports missing required columns", () => {
    expect(() => csvToInputs("item_bn,price_min\nআলু,40")).toThrow(/missing columns/);
  });
});

describe("formatting", () => {
  const t = createTranslator("bn");
  it("formats ranges and units", () => {
    expect(officialPriceText("bn", { priceMin: 40, priceMax: 45 })).toBe("৳৪০–৪৫");
    expect(officialPriceText("en", { priceMin: 1450, priceMax: null })).toBe("৳1,450");
    expect(officialUnitText("bn", t, { quantity: 1, unit: "kg", unitLabel: null })).toBe("প্রতি কেজি");
    expect(officialUnitText("bn", t, { quantity: 12, unit: "kg", unitLabel: null })).toBe("১২ কেজি");
    expect(officialUnitText("bn", t, { quantity: 1, unit: "other", unitLabel: "প্রতি ইউনিট" })).toBe("প্রতি ইউনিট");
  });
  it("marks lists older than 30 days", () => {
    expect(isOfficialStale("2026-09-01", "2026-10-29")).toBe(true);
    expect(isOfficialStale("2026-10-20", "2026-10-29")).toBe(false);
  });
});
