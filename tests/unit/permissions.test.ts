import { describe, expect, it } from "vitest";
import { canModifyComment, canModifyReport, isAdmin, isStaff } from "@/features/auth/permissions";
import { containsBlockedLanguage, containsLink, containsPhoneNumber } from "@/lib/content-checks";
import { cloudinaryUrl, sniffImageType } from "@/lib/images";
import { escapeLike, normalizeKey, approximateCoordinate } from "@/lib/utils";

const now = new Date("2026-10-29T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe("roles", () => {
  it("distinguishes staff and admins", () => {
    expect(isStaff({ role: "user" })).toBe(false);
    expect(isStaff({ role: "moderator" })).toBe(true);
    expect(isAdmin({ role: "moderator" })).toBe(false);
    expect(isAdmin({ role: "admin" })).toBe(true);
    expect(isStaff(null)).toBe(false);
  });
});

describe("ownership", () => {
  const report = { ownerHash: "abc", ownerId: null, createdAt: hoursAgo(2), status: "published" };
  it("lets the owning client edit within 48h", () => {
    expect(canModifyReport(report, { clientHash: "abc", viewer: null }, now)).toBe(true);
    expect(canModifyReport({ ...report, createdAt: hoursAgo(49) }, { clientHash: "abc", viewer: null }, now)).toBe(false);
  });
  it("blocks other clients and moderated reports", () => {
    expect(canModifyReport(report, { clientHash: "other", viewer: null }, now)).toBe(false);
    expect(canModifyReport(report, { clientHash: null, viewer: null }, now)).toBe(false);
    expect(canModifyReport({ ...report, status: "hidden" }, { clientHash: "abc", viewer: null }, now)).toBe(false);
  });
  it("recognises signed-in owners by id", () => {
    const viewer = { id: "u1", role: "user" as const, displayName: null };
    expect(canModifyReport({ ...report, ownerHash: "x", ownerId: "u1" }, { clientHash: null, viewer }, now)).toBe(true);
  });
  it("comments: 24h window and not after deletion", () => {
    const c = { ownerHash: "abc", ownerId: null, createdAt: hoursAgo(1), status: "published", deletedAt: null };
    expect(canModifyComment(c, { clientHash: "abc", viewer: null }, now)).toBe(true);
    expect(canModifyComment({ ...c, createdAt: hoursAgo(25) }, { clientHash: "abc", viewer: null }, now)).toBe(false);
    expect(canModifyComment({ ...c, deletedAt: now }, { clientHash: "abc", viewer: null }, now)).toBe(false);
  });
});

describe("content checks and utils", () => {
  it("detects links, phone numbers and blocked words", () => {
    expect(containsLink("visit www.shop.com")).toBe(true);
    expect(containsLink("কারওয়ান বাজার")).toBe(false);
    expect(containsPhoneNumber("call 01712345678")).toBe(true);
    expect(containsBlockedLanguage("What the FUCK")).toBe(true);
    expect(containsBlockedLanguage("দাম অনেক বেশি")).toBe(false);
  });
  it("normalises keys and escapes LIKE", () => {
    expect(normalizeKey("  Soybean   Oil! ")).toBe("soybean oil");
    expect(normalizeKey("কাঁচা-মরিচ")).toBe("কাঁচা মরিচ");
    expect(escapeLike("50%_off")).toBe("50\\%\\_off");
  });
  it("approximates coordinates to ~100 m", () => {
    expect(approximateCoordinate(23.810331)).toBe(23.81);
    expect(approximateCoordinate(90.41251)).toBe(90.413);
  });
  it("sniffs real image types", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
  it("builds Cloudinary transformation URLs", () => {
    expect(cloudinaryUrl("https://res.cloudinary.com/demo/image/upload/v1/a.jpg", 320)).toBe("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_320/v1/a.jpg");
  });
});
