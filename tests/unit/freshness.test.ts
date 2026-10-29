import { describe, expect, it } from "vitest";
import { freshnessLabel, getFreshness } from "@/features/prices/freshness";
import { createTranslator } from "@/lib/i18n/core";
import { daysBetween, dhakaToday, shiftDate } from "@/lib/utils";

describe("freshness", () => {
  const today = "2026-10-29";
  it("classifies by report date", () => {
    expect(getFreshness(today, today)).toEqual({ level: "today", days: 0 });
    expect(getFreshness("2026-10-25", today)).toEqual({ level: "recent", days: 4 });
    expect(getFreshness("2026-10-01", today)).toEqual({ level: "stale", days: 28 });
  });
  it("labels in Bengali and English", () => {
    const bn = createTranslator("bn");
    const en = createTranslator("en");
    expect(freshnessLabel(bn, getFreshness(today, today))).toBe("আজকের তথ্য");
    expect(freshnessLabel(en, getFreshness("2026-10-28", today))).toBe("Yesterday");
    expect(freshnessLabel(bn, getFreshness("2026-10-26", today))).toBe("৩ দিন আগে");
    expect(freshnessLabel(en, getFreshness("2026-09-01", today))).toContain("May be outdated");
  });
  it("uses Bangladesh time for 'today'", () => {
    // 20:00 UTC is already the next day in Dhaka (UTC+6).
    expect(dhakaToday(new Date("2026-10-28T20:00:00Z"))).toBe("2026-10-29");
    expect(daysBetween("2026-02-27", "2026-03-01")).toBe(2);
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
  });
});
