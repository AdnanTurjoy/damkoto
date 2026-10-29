import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { priceReports } from "@/db/schema";
import type { Database } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { compareGroups, getComparisonSets, resolveProductKey } from "@/features/prices/compare";
import { parsePriceFilters } from "@/features/prices/filters";
import { getMapData } from "@/features/map/queries";
import { listReports } from "@/features/prices/queries";
import { createPriceReport, deletePriceReport, updatePriceReport } from "@/features/prices/service";
import { consumeRateLimit } from "@/lib/rate-limit";
import { categoryId, createTestDb, CUMILLA, DEBIDWAR, DHAKA, guest, reportInput, SAVAR } from "./helpers";

let db: Database;
let veg: string;
let lpg: string;
const opts = { showDemo: false };

beforeAll(async () => {
  db = await createTestDb();
  veg = await categoryId(db, "vegetables");
  lpg = await categoryId(db, "lpg-refill");
});

async function expectAppError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
}

describe("creating price reports", () => {
  it("creates a published report without name or image and derives the division", async () => {
    const created = await createPriceReport(db, reportInput({ categoryId: veg }, { districtId: DHAKA.districtId, upazilaId: SAVAR }), guest("c1"));
    expect(created.status).toBe("published");
    const [row] = await db.select().from(priceReports).where(eq(priceReports.id, created.id));
    expect(row).toMatchObject({ productKey: "potato", divisionId: DHAKA.divisionId, displayName: null, imageUrl: null, baseUnit: "kg", locationMethod: "admin" });
    expect(row.lat).not.toBeNull(); // district centroid
  });

  it("groups Bengali and English names via the catalog", async () => {
    const created = await createPriceReport(db, reportInput({ productName: "Potato", categoryId: veg, price: "21", quantity: "500", unit: "g" }, CUMILLA), guest("c2"));
    const [row] = await db.select().from(priceReports).where(eq(priceReports.id, created.id));
    expect(row.productKey).toBe("potato");
    expect(Number(row.unitPrice)).toBe(42);
  });

  it("rounds map coordinates for privacy", async () => {
    const created = await createPriceReport(db, reportInput({ categoryId: veg, price: "38" }, { ...DHAKA, lat: 23.810331, lng: 90.412518, method: "map" }), guest("c3"));
    const [row] = await db.select().from(priceReports).where(eq(priceReports.id, created.id));
    expect(row).toMatchObject({ lat: 23.81, lng: 90.413, locationMethod: "map" });
  });

  it("rejects invalid prices and missing locations", async () => {
    await expectAppError(createPriceReport(db, reportInput({ categoryId: veg, price: "-3" }), guest("c4")), "errors.invalidInput");
    await expectAppError(createPriceReport(db, reportInput({ categoryId: veg }, {}), guest("c4")), "errors.invalidInput");
  });

  it("validates the location hierarchy on the server", async () => {
    await expectAppError(createPriceReport(db, reportInput({ categoryId: veg }, { districtId: CUMILLA.districtId, upazilaId: SAVAR }), guest("c5")), "errors.locationInvalid");
    await expectAppError(createPriceReport(db, reportInput({ categoryId: veg }, { districtId: CUMILLA.districtId, divisionId: DHAKA.divisionId }), guest("c5")), "errors.locationInvalid");
    await expectAppError(createPriceReport(db, reportInput({ categoryId: veg }, { districtId: SAVAR }), guest("c5")), "errors.locationInvalid");
  });

  it("rejects duplicate submissions from the same client", async () => {
    const input = reportInput({ categoryId: veg, price: "55" }, CUMILLA);
    await createPriceReport(db, input, guest("dup"));
    await expectAppError(createPriceReport(db, input, guest("dup")), "errors.duplicate");
  });

  it("rejects image URLs from other origins", async () => {
    await expectAppError(
      createPriceReport(db, reportInput({ categoryId: veg, price: "41", imageUrl: "https://res.cloudinary.com/attacker/image/upload/x.jpg" }), guest("img", { imageCloudName: "mine" })),
      "errors.imageInvalid",
    );
  });

  it("holds reports with abusive language for review, flags links", async () => {
    const abusive = await createPriceReport(db, reportInput({ categoryId: veg, price: "47", note: "shit price" }), guest("lang"));
    expect(abusive.status).toBe("pending");
    const link = await createPriceReport(db, reportInput({ categoryId: veg, price: "48", note: "see www.myshop.com" }), guest("link"));
    const [row] = await db.select().from(priceReports).where(eq(priceReports.id, link.id));
    expect(row.status).toBe("published");
    expect(row.flags).toContain("contains_link");
  });

  it("puts everything in pending when pre-moderation is on", async () => {
    const r = await createPriceReport(db, reportInput({ categoryId: veg, price: "44" }), guest("pre", { moderationMode: "pre" }));
    expect(r.status).toBe("pending");
  });

  it("separates LPG package sizes", async () => {
    await createPriceReport(db, reportInput({ productName: "LPG", categoryId: lpg, price: "1450", unit: "cylinder", packageDescription: "12 kg" }), guest("g1"));
    await createPriceReport(db, reportInput({ productName: "LPG", categoryId: lpg, price: "4200", unit: "cylinder", packageDescription: "35 kg" }, CUMILLA), guest("g2"));
    const sets = await getComparisonSets(db, "lpg-12kg-refill", {}, opts);
    expect(sets.map((s) => s.variantKey).sort()).toEqual(["12 kg", "35 kg"]);
  });
});

describe("editing and deleting", () => {
  it("lets the owner edit and delete, but not others", async () => {
    const { id } = await createPriceReport(db, reportInput({ categoryId: veg, price: "33", productName: "টমেটো" }), guest("owner"));
    await expectAppError(updatePriceReport(db, id, reportInput({ categoryId: veg, price: "34", productName: "টমেটো" }), guest("intruder")), "errors.forbidden");
    const updated = await updatePriceReport(db, id, reportInput({ categoryId: veg, price: "35", productName: "টমেটো" }), guest("owner"));
    expect(updated.id).toBe(id);
    const [row] = await db.select().from(priceReports).where(eq(priceReports.id, id));
    expect(Number(row.price)).toBe(35);
    await expectAppError(deletePriceReport(db, id, { clientHash: "intruder", viewer: null }), "errors.forbidden");
    await deletePriceReport(db, id, { clientHash: "owner", viewer: null });
    expect(await db.select().from(priceReports).where(eq(priceReports.id, id))).toHaveLength(0);
  });

  it("closes the edit window after 48 hours", async () => {
    const { id } = await createPriceReport(db, reportInput({ categoryId: veg, price: "36", productName: "শসা" }), guest("late"));
    await db.update(priceReports).set({ createdAt: new Date(Date.now() - 49 * 3_600_000) }).where(eq(priceReports.id, id));
    await expectAppError(deletePriceReport(db, id, { clientHash: "late", viewer: null }), "errors.editWindowClosed");
  });
});

describe("reading, filtering and comparing", () => {
  it("returns only published reports", async () => {
    const all = await listReports(db, parsePriceFilters({}), opts);
    expect(all.items.every((r) => r.status === "published")).toBe(true);
    expect(all.items.some((r) => r.productName === "আলু")).toBe(true);
  });

  it("searches Bengali, English and catalog aliases", async () => {
    for (const q of ["আলু", "potato", "alu", "Potat"]) {
      const res = await listReports(db, parsePriceFilters({ q }), opts);
      expect(res.total, q).toBeGreaterThanOrEqual(3);
    }
  });

  it("filters by location, category and price", async () => {
    const dhaka = await listReports(db, parsePriceFilters({ district: String(DHAKA.districtId) }), opts);
    expect(dhaka.items.length).toBeGreaterThan(0);
    expect(dhaka.items.every((r) => r.districtId === DHAKA.districtId)).toBe(true);
    const upazila = await listReports(db, parsePriceFilters({ upazila: String(DEBIDWAR) }), opts);
    expect(upazila.total).toBe(0);
    const gas = await listReports(db, parsePriceFilters({ category: "gas-fuel" }), opts);
    expect(gas.items.every((r) => r.categorySlug === "lpg-refill")).toBe(true);
    const cheap = await listReports(db, parsePriceFilters({ base: "kg", maxPrice: "40" }), opts);
    expect(cheap.items.every((r) => (r.unitPrice ?? 0) <= 40)).toBe(true);
  });

  it("paginates", async () => {
    const page1 = await listReports(db, parsePriceFilters({}), { ...opts, pageSize: 2 });
    const page2 = await listReports(db, parsePriceFilters({ page: "2" }), { ...opts, pageSize: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page2.items[0].id).not.toBe(page1.items[0].id);
    expect(page1.pageCount).toBe(Math.ceil(page1.total / 2));
  });

  it("compares by district with min/median/max and single-report marking", async () => {
    const product = await resolveProductKey(db, "আলু");
    expect(product?.key).toBe("potato");
    const [set] = await getComparisonSets(db, "potato", {}, opts);
    const groups = await compareGroups(db, { productKey: "potato", set, groupBy: "district", window: {} }, opts);
    const dhaka = groups.find((g) => g.groupId === String(DHAKA.districtId))!;
    expect(dhaka.count).toBeGreaterThanOrEqual(2);
    expect(dhaka.min).toBeLessThanOrEqual(dhaka.median);
    expect(dhaka.median).toBeLessThanOrEqual(dhaka.max);
    const single = groups.find((g) => g.count === 1);
    if (single) expect(single.singleReportId).toBeTruthy();
  });

  it("returns map points within a bounding box", async () => {
    const data = await getMapData(db, parsePriceFilters({ bbox: "90.0,23.5,90.8,24.2" }), 10, opts);
    expect(data.mode).toBe("points");
    if (data.mode === "points") expect(data.points.every((p) => p.lat >= 23.5 && p.lat <= 24.2)).toBe(true);
  });
});

describe("rate limiting", () => {
  it("allows up to the limit within the window", async () => {
    const rule = { limit: 3, windowSeconds: 60 };
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await consumeRateLimit(db, "test:key", rule));
    expect(results).toEqual([true, true, true, false]);
  });
});
