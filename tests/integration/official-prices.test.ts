import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { importOfficialPricesCsv, listOfficialPrices, officialPricesForProduct, saveOfficialPrice, setOfficialPriceActive } from "@/features/official-prices/service";
import { createStaff, createTestDb } from "./helpers";

let db: Database;
const entry = (o: Record<string, unknown> = {}) => ({ category: "essentials", source: "TCB", itemBn: "আলু", itemEn: "Potato", productSlug: "potato", priceMin: "40", priceMax: "45", unit: "kg", area: "ঢাকা", effectiveDate: "2026-10-01", ...o });

beforeAll(async () => {
  db = await createTestDb();
});

describe("official prices", () => {
  it("only staff can write", async () => {
    await expect(saveOfficialPrice(db, null, null, entry())).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === "errors.unauthorized");
    await expect(saveOfficialPrice(db, { id: "00000000-0000-4000-8000-000000000123", role: "user", displayName: null }, null, entry())).rejects.toSatisfy(
      (e: unknown) => e instanceof AppError && e.code === "errors.forbidden",
    );
  });

  it("saves, computes comparable prices, and upserts the same publication", async () => {
    const mod = await createStaff(db, "moderator");
    await saveOfficialPrice(db, mod, null, entry({ priceMin: "450", priceMax: "500", quantity: "10" }));
    await saveOfficialPrice(db, mod, null, entry({ priceMin: "42", priceMax: "46", quantity: "1" }));
    const rows = await listOfficialPrices(db, { productSlug: "potato" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ priceMin: 42, priceMax: 46, baseUnit: "kg", unitMin: 42 });
  });

  it("shows only the latest publication by default, history on request", async () => {
    const mod = await createStaff(db, "moderator");
    await saveOfficialPrice(db, mod, null, entry({ effectiveDate: "2026-10-10", priceMin: "50", priceMax: "" }));
    expect((await listOfficialPrices(db, { productSlug: "potato" })).map((r) => r.effectiveDate)).toEqual(["2026-10-10"]);
    expect(await listOfficialPrices(db, { productSlug: "potato", latestOnly: false })).toHaveLength(2);
  });

  it("matches reports by product and comparable unit", async () => {
    expect(await officialPricesForProduct(db, "potato", "kg")).toHaveLength(1);
    expect(await officialPricesForProduct(db, "potato", "piece")).toHaveLength(0);
    expect(await officialPricesForProduct(db, "onion", "kg")).toHaveLength(0);
  });

  it("hides and restores entries", async () => {
    const mod = await createStaff(db, "moderator");
    const [row] = await listOfficialPrices(db, { productSlug: "potato" });
    await setOfficialPriceActive(db, mod, row.id, false);
    const visible = await listOfficialPrices(db, { productSlug: "potato" });
    expect(visible.find((r) => r.id === row.id)).toBeUndefined();
    await setOfficialPriceActive(db, mod, row.id, true);
  });

  it("imports CSV all-or-nothing", async () => {
    const admin = await createStaff(db, "admin");
    const header = "category,source,item_bn,item_en,product_slug,price_min,price_max,quantity,unit,unit_label,area,effective_date,source_url,note";
    const bad = `${header}\nlpg,BERC,এলপিজি,LPG 12kg,lpg-12kg-refill,1450,,1,cylinder,,সারাদেশ,2026-10-02,https://berc.gov.bd,\nfuel,BPC,অকটেন,Octane,octane,-1,,1,l,,সারাদেশ,2026-10-01,,\n`;
    const r1 = await importOfficialPricesCsv(db, admin, bad);
    expect(r1.saved).toBe(0);
    expect(r1.errors[0].line).toBe(3);
    expect(await listOfficialPrices(db, { category: "lpg" })).toHaveLength(0);
    const good = bad.replace(",-1,", ",130,");
    const r2 = await importOfficialPricesCsv(db, admin, good);
    expect(r2).toEqual({ saved: 2, errors: [] });
    expect(await officialPricesForProduct(db, "lpg-12kg-refill", "cylinder")).toHaveLength(1);
  });
});
