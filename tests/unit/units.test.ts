import { describe, expect, it } from "vitest";
import { baseUnitOf, comparableUnitPrice, isConvertibleBase, isUnitCode } from "@/features/prices/units";

describe("comparableUnitPrice", () => {
  it("converts grams to price per kg", () => {
    expect(comparableUnitPrice(30, 500, "g")).toEqual({ baseUnit: "kg", unitPrice: 60 });
  });
  it("converts millilitres to price per litre", () => {
    expect(comparableUnitPrice(95, 500, "ml")).toEqual({ baseUnit: "l", unitPrice: 190 });
  });
  it("converts dozen and hali to price per piece", () => {
    expect(comparableUnitPrice(150, 1, "dozen")).toEqual({ baseUnit: "piece", unitPrice: 12.5 });
    expect(comparableUnitPrice(60, 1, "hali")).toEqual({ baseUnit: "piece", unitPrice: 15 });
  });
  it("keeps package units unconverted", () => {
    expect(comparableUnitPrice(1450, 1, "cylinder")).toEqual({ baseUnit: "cylinder", unitPrice: 1450 });
    expect(isConvertibleBase(baseUnitOf("sack"))).toBe(false);
    expect(isConvertibleBase(baseUnitOf("g"))).toBe(true);
  });
  it("rounds to 4 decimals", () => {
    expect(comparableUnitPrice(10, 3, "kg").unitPrice).toBe(3.3333);
  });
  it("rejects non-positive values", () => {
    expect(() => comparableUnitPrice(0, 1, "kg")).toThrow(RangeError);
    expect(() => comparableUnitPrice(10, -1, "kg")).toThrow(RangeError);
  });
  it("validates unit codes", () => {
    expect(isUnitCode("kg")).toBe(true);
    expect(isUnitCode("tola")).toBe(false);
  });
});
