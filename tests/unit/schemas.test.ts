import { describe, expect, it } from "vitest";
import { commentInputSchema, contentReportInputSchema } from "@/schemas/community";
import { fieldErrors, priceReportInputSchema } from "@/schemas/price-report";
import { shiftDate, dhakaToday } from "@/lib/utils";

const valid = {
  productName: "  আলু  ",
  categoryId: "5b6f7d2e-8a3c-4c1e-9f00-123456789abc",
  price: "৪৫",
  quantity: "1",
  unit: "kg",
  location: { districtId: "1001", divisionId: "1", upazilaId: "", locality: "" },
};

describe("priceReportInputSchema", () => {
  it("accepts a minimal report and normalises input", () => {
    const r = priceReportInputSchema.parse(valid);
    expect(r.productName).toBe("আলু");
    expect(r.price).toBe(45);
    expect(r.displayName).toBeUndefined();
    expect(r.location).toMatchObject({ districtId: 1001, method: "admin" });
  });
  it("accepts comma-formatted prices", () => {
    expect(priceReportInputSchema.parse({ ...valid, price: "1,450" }).price).toBe(1450);
  });
  it("rejects invalid prices", () => {
    for (const price of ["0", "-5", "abc", "", "99999999999"]) {
      const r = priceReportInputSchema.safeParse({ ...valid, price });
      expect(r.success).toBe(false);
    }
    const err = priceReportInputSchema.safeParse({ ...valid, price: "-1" });
    expect(fieldErrors(err.error!).price).toBe("errors.priceInvalid");
  });
  it("requires a location", () => {
    const r = priceReportInputSchema.safeParse({ ...valid, location: { districtId: "" } });
    expect(r.success).toBe(false);
    expect(fieldErrors(r.error!)["location.districtId"]).toBe("errors.locationRequired");
  });
  it("validates quantity, unit and package description", () => {
    expect(priceReportInputSchema.safeParse({ ...valid, quantity: "0" }).success).toBe(false);
    expect(priceReportInputSchema.safeParse({ ...valid, unit: "tola" }).success).toBe(false);
    const other = priceReportInputSchema.safeParse({ ...valid, unit: "other" });
    expect(fieldErrors(other.error!).packageDescription).toBe("errors.packageRequired");
  });
  it("limits text length and rejects future/old dates", () => {
    expect(priceReportInputSchema.safeParse({ ...valid, productName: "x".repeat(121) }).success).toBe(false);
    expect(priceReportInputSchema.safeParse({ ...valid, note: "x".repeat(501) }).success).toBe(false);
    expect(priceReportInputSchema.safeParse({ ...valid, purchaseDate: shiftDate(dhakaToday(), 2) }).success).toBe(false);
    expect(priceReportInputSchema.safeParse({ ...valid, purchaseDate: shiftDate(dhakaToday(), -400) }).success).toBe(false);
  });
  it("requires both coordinates within Bangladesh", () => {
    expect(priceReportInputSchema.safeParse({ ...valid, location: { ...valid.location, lat: 23.8 } }).success).toBe(false);
    expect(priceReportInputSchema.safeParse({ ...valid, location: { ...valid.location, lat: 51.5, lng: -0.1 } }).success).toBe(false);
    expect(priceReportInputSchema.safeParse({ ...valid, location: { ...valid.location, lat: 23.8, lng: 90.4, method: "map" } }).success).toBe(true);
  });
  it("only accepts Cloudinary image URLs", () => {
    expect(priceReportInputSchema.safeParse({ ...valid, imageUrl: "https://evil.example/x.jpg" }).success).toBe(false);
    expect(priceReportInputSchema.safeParse({ ...valid, imageUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("community schemas", () => {
  const reportId = "5b6f7d2e-8a3c-4c1e-9f00-123456789abc";
  it("accepts sticker-only and text comments, rejects empty", () => {
    expect(commentInputSchema.safeParse({ reportId, stickerId: "thanks" }).success).toBe(true);
    expect(commentInputSchema.safeParse({ reportId, body: "দাম ঠিক আছে" }).success).toBe(true);
    expect(commentInputSchema.safeParse({ reportId, body: "   " }).success).toBe(false);
    expect(commentInputSchema.safeParse({ reportId, stickerId: "<script>" }).success).toBe(false);
  });
  it("validates content report reasons", () => {
    expect(contentReportInputSchema.safeParse({ targetType: "report", targetId: reportId, reason: "spam" }).success).toBe(true);
    expect(contentReportInputSchema.safeParse({ targetType: "user", targetId: reportId, reason: "spam" }).success).toBe(false);
  });
});
