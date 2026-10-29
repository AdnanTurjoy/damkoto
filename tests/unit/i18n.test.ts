import { describe, expect, it } from "vitest";
import { createTranslator, formatTaka, lookup, translateLoose } from "@/lib/i18n/core";
import { bn } from "@/messages/bn";
import { en } from "@/messages/en";
import { pages } from "@/messages/pages";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === "string" ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`)));
}

describe("translations", () => {
  it("Bengali and English define exactly the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(bn).sort());
  });
  it("has no empty strings", () => {
    for (const k of keys(bn)) expect(lookup(bn, k)?.trim().length, k).toBeGreaterThan(0);
    for (const k of keys(en)) expect(lookup(en, k)?.trim().length, k).toBeGreaterThan(0);
  });
  it("interpolates with locale-specific digits", () => {
    expect(createTranslator("bn")("prices.results", { count: 12 })).toBe("১২টি ফলাফল");
    expect(createTranslator("en")("prices.results", { count: 12 })).toBe("12 results");
  });
  it("falls back safely for unknown keys", () => {
    const t = createTranslator("en");
    expect(translateLoose(t, "errors.duplicate")).toBe(en.errors.duplicate);
    expect(translateLoose(t, "not.a.key")).toBe(en.errors.server);
  });
  it("formats taka", () => {
    expect(formatTaka("bn", 45)).toBe("৳৪৫");
    expect(formatTaka("en", 1450)).toBe("৳1,450");
  });
  it("has every static page in both languages", () => {
    expect(Object.keys(pages.en).sort()).toEqual(Object.keys(pages.bn).sort());
  });
});
