import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/** Staff and registered contributors. `id` equals the Supabase auth user id. */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  role: text("role", { enum: ["user", "moderator", "admin"] }).notNull().default("user"),
  ...timestamps,
});

/** Division → district → upazila hierarchy. */
export const locations = pgTable(
  "locations",
  {
    id: integer("id").primaryKey(),
    level: text("level", { enum: ["division", "district", "upazila"] }).notNull(),
    parentId: integer("parent_id").references((): AnyPgColumn => locations.id),
    slug: text("slug").notNull(),
    nameBn: text("name_bn").notNull(),
    nameEn: text("name_en").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
  },
  (t) => [uniqueIndex("locations_slug_key").on(t.slug), index("locations_parent_idx").on(t.parentId)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    nameBn: text("name_bn").notNull(),
    nameEn: text("name_en").notNull(),
    icon: text("icon").notNull().default("package"),
    sortOrder: smallint("sort_order").notNull().default(100),
    isActive: boolean("is_active").notNull().default(true),
    /** Unit codes suggested first in the submission form; null means all units. */
    suggestedUnits: text("suggested_units").array(),
    ...timestamps,
  },
  (t) => [uniqueIndex("categories_slug_key").on(t.slug), index("categories_parent_idx").on(t.parentId)],
);

/**
 * Canonical product catalog used for suggestions and to group Bengali and
 * English names of the same product for comparison.
 */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    nameBn: text("name_bn").notNull(),
    nameEn: text("name_en").notNull(),
    aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
    defaultUnit: text("default_unit"),
    ...timestamps,
  },
  (t) => [uniqueIndex("products_slug_key").on(t.slug), index("products_category_idx").on(t.categoryId)],
);

export const REPORT_STATUSES = ["pending", "published", "rejected", "hidden"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const priceReports = pgTable(
  "price_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productName: text("product_name").notNull(),
    /** Grouping key for comparisons: catalog slug or normalised product name. */
    productKey: text("product_key").notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    brand: text("brand"),
    variant: text("variant"),
    variantKey: text("variant_key").notNull().default(""),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("BDT"),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    unit: text("unit").notNull(),
    packageDescription: text("package_description"),
    /** Base unit for comparison (kg, l, piece, m) or null when not convertible. */
    baseUnit: text("base_unit"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 4 }),
    condition: text("condition", { enum: ["new", "used"] }),
    note: text("note"),
    imageUrl: text("image_url"),
    imageWidth: integer("image_width"),
    imageHeight: integer("image_height"),
    contributorId: uuid("contributor_id").references(() => profiles.id, { onDelete: "set null" }),
    displayName: text("display_name"),
    /** HMAC of the anonymous client cookie. Never exposed publicly. */
    submitterHash: text("submitter_hash").notNull(),
    purchaseDate: date("purchase_date", { mode: "string" }),
    /** purchase_date when given, else the submission date. Drives freshness. */
    reportDate: date("report_date", { mode: "string" }).notNull(),
    status: text("status", { enum: REPORT_STATUSES }).notNull().default("published"),
    flags: text("flags").array().notNull().default(sql`'{}'::text[]`),
    isDemo: boolean("is_demo").notNull().default(false),
    divisionId: integer("division_id")
      .notNull()
      .references(() => locations.id),
    districtId: integer("district_id")
      .notNull()
      .references(() => locations.id),
    upazilaId: integer("upazila_id").references(() => locations.id),
    locality: text("locality"),
    marketName: text("market_name"),
    /** Approximate public coordinates (rounded ~100 m), never exact home points. */
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    locationMethod: text("location_method", { enum: ["admin", "map", "gps"] }).notNull().default("admin"),
    commentCount: integer("comment_count").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("price_reports_status_date_idx").on(t.status, t.reportDate.desc(), t.createdAt.desc()),
    index("price_reports_product_idx").on(t.productKey, t.baseUnit, t.variantKey),
    index("price_reports_category_idx").on(t.categoryId),
    index("price_reports_district_idx").on(t.districtId),
    index("price_reports_upazila_idx").on(t.upazilaId),
    index("price_reports_geo_idx").on(t.lat, t.lng),
    index("price_reports_submitter_idx").on(t.submitterHash, t.createdAt),
    index("price_reports_name_trgm_idx").using("gin", sql`${t.productName} gin_trgm_ops`),
    index("price_reports_brand_trgm_idx").using("gin", sql`${t.brand} gin_trgm_ops`),
  ],
);

export const COMMENT_STATUSES = ["published", "hidden", "removed"] as const;

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => priceReports.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => profiles.id, { onDelete: "set null" }),
    authorHash: text("author_hash").notNull(),
    displayName: text("display_name"),
    body: text("body"),
    stickerId: text("sticker_id"),
    districtId: integer("district_id").references(() => locations.id),
    upazilaId: integer("upazila_id").references(() => locations.id),
    locality: text("locality"),
    status: text("status", { enum: COMMENT_STATUSES }).notNull().default("published"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("comments_report_idx").on(t.reportId, t.createdAt),
    index("comments_parent_idx").on(t.parentId),
    index("comments_author_idx").on(t.authorHash, t.createdAt),
  ],
);

/** Sticker reactions on a report; one of each sticker per client. */
export const reportReactions = pgTable(
  "report_reactions",
  {
    reportId: uuid("report_id")
      .notNull()
      .references(() => priceReports.id, { onDelete: "cascade" }),
    stickerId: text("sticker_id").notNull(),
    clientHash: text("client_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.reportId, t.stickerId, t.clientHash] })],
);

export const contentReports = pgTable(
  "content_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type", { enum: ["report", "comment"] }).notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    reporterHash: text("reporter_hash").notNull(),
    status: text("status", { enum: ["open", "resolved", "dismissed"] }).notNull().default("open"),
    resolvedBy: uuid("resolved_by").references(() => profiles.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("content_reports_status_idx").on(t.status, t.createdAt),
    index("content_reports_target_idx").on(t.targetType, t.targetId),
    uniqueIndex("content_reports_once_key").on(t.targetType, t.targetId, t.reporterHash),
  ],
);

export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    targetType: text("target_type", { enum: ["report", "comment", "category", "content_report", "profile", "official_price"] }).notNull(),
    targetId: text("target_id").notNull(),
    action: text("action").notNull(),
    note: text("note"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("moderation_actions_created_idx").on(t.createdAt), index("moderation_actions_target_idx").on(t.targetType, t.targetId)],
);

/** Fixed-window counters for abuse-prone operations (serverless-safe). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

/** Cached reverse-geocoding results (only when a geocoder is enabled). */
export const geocodeCache = pgTable("geocode_cache", {
  key: text("key").primaryKey(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const OFFICIAL_CATEGORIES = ["essentials", "vegetables", "lpg", "fuel", "fertilizer", "medicine", "utility", "transport", "gold", "other"] as const;
export const OFFICIAL_SOURCES = ["TCB", "DAM", "BERC", "BPC", "MOC", "DGDA", "BAJUS", "BRTA", "BIWTA", "RAILWAY", "WASA", "BBS", "MOA", "OTHER"] as const;

/**
 * Prices published by government or regulated bodies, entered by staff from
 * the official source. Kept separate from community reports and always shown
 * with its source, link and publication date.
 */
export const officialPrices = pgTable(
  "official_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: text("category", { enum: OFFICIAL_CATEGORIES }).notNull(),
    source: text("source", { enum: OFFICIAL_SOURCES }).notNull(),
    itemBn: text("item_bn").notNull(),
    itemEn: text("item_en").notNull(),
    /** Links to the catalog so report and compare pages can show it. */
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    priceMin: numeric("price_min", { precision: 12, scale: 2 }).notNull(),
    priceMax: numeric("price_max", { precision: 12, scale: 2 }),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("1"),
    unit: text("unit").notNull(),
    /** Overrides the unit label, e.g. "প্রতি কিলোওয়াট-ঘণ্টা". */
    unitLabel: text("unit_label"),
    baseUnit: text("base_unit"),
    unitMin: numeric("unit_min", { precision: 14, scale: 4 }),
    unitMax: numeric("unit_max", { precision: 14, scale: 4 }),
    area: text("area").notNull(),
    effectiveDate: date("effective_date", { mode: "string" }).notNull(),
    sourceUrl: text("source_url"),
    note: text("note"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("official_prices_category_idx").on(t.category, t.effectiveDate.desc()),
    index("official_prices_product_idx").on(t.productId, t.effectiveDate.desc()),
    uniqueIndex("official_prices_entry_key").on(t.source, t.itemEn, t.area, t.effectiveDate),
  ],
);
