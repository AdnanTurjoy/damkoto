import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { comments, contentReports, moderationActions, priceReports } from "@/db/schema";
import type { Database } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { createComment, deleteComment, editComment, listComments, toggleReaction } from "@/features/comments/service";
import { createContentReport, moderateComment, moderateReport, resolveContentReport, saveCategory, setUserRole } from "@/features/moderation/service";
import { listReports } from "@/features/prices/queries";
import { parsePriceFilters } from "@/features/prices/filters";
import { createPriceReport } from "@/features/prices/service";
import { categoryId, createStaff, createTestDb, DHAKA, guest, reportInput } from "./helpers";

let db: Database;
let reportId: string;

beforeAll(async () => {
  db = await createTestDb();
  const veg = await categoryId(db, "vegetables");
  reportId = (await createPriceReport(db, reportInput({ categoryId: veg, price: "50", productName: "পেঁয়াজ" }), guest("author"))).id;
});

const expectCode = (code: string) => (e: unknown) => e instanceof AppError && e.code === code;
const actor = (clientHash: string) => ({ clientHash, viewer: null });

describe("comments", () => {
  it("adds text, sticker-only and located comments, and counts them", async () => {
    const text = await createComment(db, { reportId, body: "আমার এলাকায় ৫৫ টাকা" }, actor("u1"));
    expect(text).toMatchObject({ displayName: null, canModify: true });
    const sticker = await createComment(db, { reportId, stickerId: "too_expensive", displayName: "রহিম" }, actor("u2"));
    expect(sticker.stickerId).toBe("too_expensive");
    const located = await createComment(db, { reportId, body: "ok", districtId: DHAKA.districtId, locality: "মিরপুর" }, actor("u3"));
    expect(located.placeBn).toContain("মিরপুর");
    const [row] = await db.select({ n: priceReports.commentCount }).from(priceReports).where(eq(priceReports.id, reportId));
    expect(row.n).toBe(3);
  });

  it("supports one level of replies", async () => {
    const parent = await createComment(db, { reportId, body: "parent" }, actor("p"));
    const reply = await createComment(db, { reportId, parentId: parent.id, body: "reply" }, actor("r"));
    await expect(createComment(db, { reportId, parentId: reply.id, body: "too deep" }, actor("r"))).rejects.toSatisfy(expectCode("errors.replyDepth"));
    const list = await listComments(db, reportId, actor("x"));
    expect(list.comments.find((c) => c.id === reply.id)?.parentId).toBe(parent.id);
  });

  it("stores comment text verbatim (rendered escaped by React)", async () => {
    const c = await createComment(db, { reportId, body: "<img src=x onerror=alert(1)>" }, actor("xss"));
    expect(c.body).toBe("<img src=x onerror=alert(1)>");
  });

  it("rejects empty and abusive comments", async () => {
    await expect(createComment(db, { reportId, body: " " }, actor("e"))).rejects.toSatisfy(expectCode("errors.commentEmpty"));
    await expect(createComment(db, { reportId, body: "you bastard" }, actor("e"))).rejects.toSatisfy(expectCode("errors.inappropriate"));
  });

  it("lets only the author edit or delete", async () => {
    const c = await createComment(db, { reportId, body: "first" }, actor("me"));
    await expect(editComment(db, { commentId: c.id, body: "hacked" }, actor("you"))).rejects.toSatisfy(expectCode("errors.forbidden"));
    const edited = await editComment(db, { commentId: c.id, body: "second" }, actor("me"));
    expect(edited.body).toBe("second");
    await deleteComment(db, c.id, actor("me"));
    const [row] = await db.select().from(comments).where(eq(comments.id, c.id));
    expect(row.deletedAt).not.toBeNull();
  });

  it("toggles sticker reactions once per client", async () => {
    let r = await toggleReaction(db, { reportId, stickerId: "thanks" }, "rx");
    expect(r.find((x) => x.stickerId === "thanks")).toMatchObject({ count: 1, mine: true });
    r = await toggleReaction(db, { reportId, stickerId: "thanks" }, "rx");
    expect(r.find((x) => x.stickerId === "thanks")).toMatchObject({ count: 0, mine: false });
  });
});

describe("content reports and moderation", () => {
  it("accepts one flag per reporter per target", async () => {
    await createContentReport(db, { targetType: "report", targetId: reportId, reason: "wrong_price" }, "flagger");
    await expect(createContentReport(db, { targetType: "report", targetId: reportId, reason: "spam" }, "flagger")).rejects.toSatisfy(expectCode("errors.alreadyReported"));
  });

  it("blocks moderation for guests and regular users", async () => {
    await expect(moderateReport(db, null, reportId, "hide")).rejects.toSatisfy(expectCode("errors.unauthorized"));
    await expect(moderateReport(db, { id: "00000000-0000-4000-8000-000000000999", role: "user", displayName: null }, reportId, "hide")).rejects.toSatisfy(expectCode("errors.forbidden"));
  });

  it("moderator resolves a flag by hiding the report, with an audit trail", async () => {
    const mod = await createStaff(db, "moderator");
    const [flag] = await db.select().from(contentReports).where(eq(contentReports.targetId, reportId));
    await resolveContentReport(db, mod, flag.id, "resolve", "confirmed wrong");
    const [report] = await db.select({ status: priceReports.status }).from(priceReports).where(eq(priceReports.id, reportId));
    expect(report.status).toBe("hidden");
    const visible = await listReports(db, parsePriceFilters({ q: "পেঁয়াজ" }), { showDemo: false });
    expect(visible.items.find((r) => r.id === reportId)).toBeUndefined();
    const audit = await db.select().from(moderationActions);
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(["hide", "resolve"]));
    await moderateReport(db, mod, reportId, "restore");
  });

  it("approves pending reports and rejects invalid transitions", async () => {
    const mod = await createStaff(db, "moderator");
    const veg = await categoryId(db, "vegetables");
    const pending = await createPriceReport(db, reportInput({ categoryId: veg, price: "61" }), guest("pend", { moderationMode: "pre" }));
    await expect(moderateReport(db, mod, pending.id, "restore")).rejects.toBeInstanceOf(AppError);
    await moderateReport(db, mod, pending.id, "approve");
    const [row] = await db.select({ status: priceReports.status }).from(priceReports).where(eq(priceReports.id, pending.id));
    expect(row.status).toBe("published");
  });

  it("hides comments and keeps counts in sync", async () => {
    const mod = await createStaff(db, "moderator");
    const c = await createComment(db, { reportId, body: "spam spam" }, actor("spammer"));
    const before = (await db.select({ n: priceReports.commentCount }).from(priceReports).where(eq(priceReports.id, reportId)))[0].n;
    await moderateComment(db, mod, c.id, "hide");
    const after = (await db.select({ n: priceReports.commentCount }).from(priceReports).where(eq(priceReports.id, reportId)))[0].n;
    expect(after).toBe(before - 1);
    const list = await listComments(db, reportId, actor("x"));
    expect(list.comments.find((x) => x.id === c.id)).toBeUndefined();
  });

  it("only admins manage categories and roles", async () => {
    const mod = await createStaff(db, "moderator");
    const admin = await createStaff(db, "admin");
    const input = { slug: "test-cat", nameBn: "পরীক্ষা", nameEn: "Test", icon: "package", sortOrder: 5, isActive: true, suggestedUnits: ["kg"] };
    await expect(saveCategory(db, mod, null, input)).rejects.toSatisfy(expectCode("errors.forbidden"));
    await saveCategory(db, admin, null, input);
    await expect(saveCategory(db, admin, null, input)).rejects.toSatisfy(expectCode("admin.categories.slugTaken"));
    await expect(setUserRole(db, mod, admin.id, "user")).rejects.toSatisfy(expectCode("errors.forbidden"));
    await expect(setUserRole(db, admin, admin.id, "user")).rejects.toSatisfy(expectCode("admin.settings.selfRole"));
    await setUserRole(db, admin, mod.id, "admin");
  });
});
