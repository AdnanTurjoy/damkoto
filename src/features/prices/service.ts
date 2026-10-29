import { and, eq, gte, sql } from "drizzle-orm";
import { categories, locations, priceReports } from "@/db/schema";
import type { Database } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { containsBlockedLanguage, containsLink, containsPhoneNumber } from "@/lib/content-checks";
import { approximateCoordinate, dhakaToday, normalizeKey, shiftDate } from "@/lib/utils";
import { canModifyReport, type Actor } from "@/features/auth/permissions";
import { resolveCatalogProduct } from "@/features/categories/queries";
import { fieldErrors, priceReportInputSchema, type PriceReportInput } from "@/schemas/price-report";
import { comparableUnitPrice, isConvertibleBase } from "./units";

export interface SubmitContext extends Actor {
  clientHash: string;
  moderationMode: "pre" | "post";
  /** Cloudinary cloud name; image URLs from any other origin are rejected. */
  imageCloudName?: string;
  now?: Date;
}

export function parseReportInput(raw: unknown): PriceReportInput {
  const parsed = priceReportInputSchema.safeParse(raw);
  if (!parsed.success) throw new AppError("errors.invalidInput", 422, fieldErrors(parsed.error));
  return parsed.data;
}

/** Validates the administrative hierarchy server-side; derives the division. */
async function resolveLocation(db: Database, input: PriceReportInput["location"]) {
  const [district] = await db
    .select()
    .from(locations)
    .where(and(eq(locations.id, input.districtId), eq(locations.level, "district")));
  if (!district?.parentId) throw new AppError("errors.locationInvalid", 422, { "location.districtId": "errors.locationInvalid" });
  if (input.divisionId && input.divisionId !== district.parentId) {
    throw new AppError("errors.locationInvalid", 422, { "location.divisionId": "errors.locationInvalid" });
  }
  if (input.upazilaId) {
    const [upazila] = await db
      .select({ parentId: locations.parentId })
      .from(locations)
      .where(and(eq(locations.id, input.upazilaId), eq(locations.level, "upazila")));
    if (upazila?.parentId !== district.id) {
      throw new AppError("errors.locationInvalid", 422, { "location.upazilaId": "errors.locationInvalid" });
    }
  }
  const hasPoint = input.lat !== undefined && input.lng !== undefined;
  return {
    divisionId: district.parentId,
    districtId: district.id,
    upazilaId: input.upazilaId ?? null,
    locality: input.locality ?? null,
    // Exact points are never stored; admin-only selections use the district centroid.
    lat: hasPoint ? approximateCoordinate(input.lat!) : district.lat,
    lng: hasPoint ? approximateCoordinate(input.lng!) : district.lng,
    locationMethod: (hasPoint ? (input.method === "gps" ? "gps" : "map") : "admin") as "admin" | "map" | "gps",
  };
}

async function buildRow(db: Database, input: PriceReportInput, ctx: SubmitContext) {
  const [category] = await db
    .select({ id: categories.id, isActive: categories.isActive })
    .from(categories)
    .where(eq(categories.id, input.categoryId));
  if (!category?.isActive) throw new AppError("errors.categoryRequired", 422, { categoryId: "errors.categoryRequired" });

  if (input.imageUrl) {
    const prefix = ctx.imageCloudName ? `https://res.cloudinary.com/${ctx.imageCloudName}/image/upload/` : null;
    if (!prefix || !input.imageUrl.startsWith(prefix)) {
      throw new AppError("errors.imageInvalid", 422, { imageUrl: "errors.imageInvalid" });
    }
  }

  const location = await resolveLocation(db, input.location);
  const catalog = await resolveCatalogProduct(db, input.productName);
  const { baseUnit, unitPrice } = comparableUnitPrice(input.price, input.quantity, input.unit);
  const today = dhakaToday(ctx.now);

  return {
    productName: input.productName,
    productKey: catalog?.slug ?? normalizeKey(input.productName),
    productId: catalog?.id ?? null,
    categoryId: category.id,
    brand: input.brand ?? null,
    variant: input.variant ?? null,
    // Package-style units only compare against the same package description.
    variantKey: normalizeKey([input.variant, isConvertibleBase(baseUnit) ? null : input.packageDescription].filter(Boolean).join(" ")),
    price: input.price.toFixed(2),
    quantity: input.quantity.toString(),
    unit: input.unit,
    packageDescription: input.packageDescription ?? null,
    baseUnit,
    unitPrice: unitPrice.toString(),
    condition: input.condition ?? null,
    note: input.note ?? null,
    imageUrl: input.imageUrl ?? null,
    imageWidth: input.imageUrl ? (input.imageWidth ?? null) : null,
    imageHeight: input.imageUrl ? (input.imageHeight ?? null) : null,
    displayName: input.displayName ?? null,
    marketName: input.marketName ?? null,
    purchaseDate: input.purchaseDate ?? null,
    reportDate: input.purchaseDate ?? today,
    ...location,
  };
}

/**
 * Heuristic review flags. Unusual prices are flagged for moderators, never
 * deleted: a real price can legitimately differ a lot from others.
 */
async function computeFlags(db: Database, row: Awaited<ReturnType<typeof buildRow>>, ctx: SubmitContext, excludeId?: string) {
  const flags: string[] = [];
  const text = [row.productName, row.note, row.brand, row.variant, row.marketName, row.locality, row.displayName].join(" ");
  if (containsLink(text) || containsPhoneNumber(row.note)) flags.push("contains_link");
  if (containsBlockedLanguage(text)) flags.push("language");

  const since = shiftDate(dhakaToday(ctx.now), -90);
  const [stats] = await db
    .select({
      n: sql<number>`count(*)::int`,
      median: sql<number | null>`percentile_cont(0.5) within group (order by ${priceReports.unitPrice})`.mapWith((v) =>
        v === null ? null : Number(v),
      ),
    })
    .from(priceReports)
    .where(
      and(
        eq(priceReports.status, "published"),
        eq(priceReports.productKey, row.productKey),
        eq(priceReports.baseUnit, row.baseUnit),
        eq(priceReports.variantKey, row.variantKey),
        gte(priceReports.reportDate, since),
        excludeId ? sql`${priceReports.id} <> ${excludeId}` : undefined,
      ),
    );
  const unitPrice = Number(row.unitPrice);
  if (stats.n >= 5 && stats.median && (unitPrice > stats.median * 4 || unitPrice < stats.median / 4)) {
    flags.push("price_outlier");
  }

  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(priceReports)
    .where(and(eq(priceReports.submitterHash, ctx.clientHash), sql`${priceReports.createdAt} > now() - interval '1 hour'`));
  if (recent.n >= 6) flags.push("high_frequency");
  return flags;
}

function statusFor(flags: string[], ctx: SubmitContext): "pending" | "published" {
  if (ctx.moderationMode === "pre" || flags.includes("language")) return "pending";
  return "published";
}

export async function createPriceReport(db: Database, raw: unknown, ctx: SubmitContext) {
  const input = parseReportInput(raw);
  const row = await buildRow(db, input, ctx);

  const [duplicate] = await db
    .select({ id: priceReports.id })
    .from(priceReports)
    .where(
      and(
        eq(priceReports.submitterHash, ctx.clientHash),
        eq(priceReports.productKey, row.productKey),
        eq(priceReports.price, row.price),
        eq(priceReports.quantity, row.quantity),
        eq(priceReports.unit, row.unit),
        eq(priceReports.districtId, row.districtId),
        sql`${priceReports.createdAt} > now() - interval '24 hours'`,
      ),
    )
    .limit(1);
  if (duplicate) throw new AppError("errors.duplicate", 409);

  const flags = await computeFlags(db, row, ctx);
  const status = statusFor(flags, ctx);
  const [created] = await db
    .insert(priceReports)
    .values({
      ...row,
      flags,
      status,
      submitterHash: ctx.clientHash,
      contributorId: ctx.viewer?.id ?? null,
    })
    .returning({ id: priceReports.id, status: priceReports.status });
  return created;
}

async function loadOwned(db: Database, id: string, actor: Actor) {
  const [report] = await db
    .select({
      id: priceReports.id,
      status: priceReports.status,
      submitterHash: priceReports.submitterHash,
      contributorId: priceReports.contributorId,
      createdAt: priceReports.createdAt,
    })
    .from(priceReports)
    .where(eq(priceReports.id, id));
  if (!report) throw new AppError("errors.notFound", 404);
  const owned = { ownerHash: report.submitterHash, ownerId: report.contributorId, createdAt: report.createdAt, status: report.status };
  if (!canModifyReport(owned, actor)) {
    throw new AppError(owned.ownerHash === actor.clientHash ? "errors.editWindowClosed" : "errors.forbidden", 403);
  }
  return report;
}

export async function updatePriceReport(db: Database, id: string, raw: unknown, ctx: SubmitContext) {
  const existing = await loadOwned(db, id, ctx);
  const input = parseReportInput(raw);
  const row = await buildRow(db, input, ctx);
  const flags = await computeFlags(db, row, ctx, id);
  const status = existing.status === "pending" ? "pending" : statusFor(flags, ctx);
  const [updated] = await db
    .update(priceReports)
    .set({ ...row, flags, status, updatedAt: new Date() })
    .where(eq(priceReports.id, id))
    .returning({ id: priceReports.id, status: priceReports.status });
  return updated;
}

/** Owners can permanently delete their own report (comments cascade). */
export async function deletePriceReport(db: Database, id: string, actor: Actor) {
  await loadOwned(db, id, actor);
  await db.delete(priceReports).where(eq(priceReports.id, id));
}
