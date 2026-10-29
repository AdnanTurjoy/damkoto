import { z } from "zod";
import { STICKER_IDS } from "@/features/comments/stickers";

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v ?? undefined),
    z.string().max(max, "errors.textTooLong").optional(),
  );

const optionalInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().int().positive().optional(),
);

export const commentInputSchema = z
  .object({
    reportId: z.uuid(),
    parentId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.uuid().optional()),
    body: z.preprocess(
      (v) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() || undefined : v ?? undefined),
      z.string().max(1000, "errors.textTooLong").optional(),
    ),
    stickerId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(STICKER_IDS, { error: "errors.invalidSticker" }).optional()),
    displayName: optionalText(40),
    districtId: optionalInt,
    upazilaId: optionalInt,
    locality: optionalText(100),
  })
  .refine((v) => Boolean(v.body || v.stickerId), { message: "errors.commentEmpty", path: ["body"] });

export type CommentInput = z.output<typeof commentInputSchema>;

export const commentEditSchema = z.object({
  commentId: z.uuid(),
  body: z.preprocess((v) => (typeof v === "string" ? v.trim() || undefined : v), z.string().max(1000, "errors.textTooLong").optional()),
  stickerId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(STICKER_IDS).optional()),
});

export const FLAG_REASONS = ["wrong_price", "spam", "abusive", "duplicate", "privacy", "other"] as const;

export const contentReportInputSchema = z.object({
  targetType: z.enum(["report", "comment"]),
  targetId: z.uuid(),
  reason: z.enum(FLAG_REASONS),
  details: optionalText(500),
});

export const reactionInputSchema = z.object({
  reportId: z.uuid(),
  stickerId: z.enum(STICKER_IDS, { error: "errors.invalidSticker" }),
});
