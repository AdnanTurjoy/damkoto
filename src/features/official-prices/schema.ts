import { z } from "zod";
import { OFFICIAL_CATEGORIES, OFFICIAL_SOURCES } from "@/db/schema";
import { UNIT_CODES } from "@/features/prices/units";
import { dhakaToday, toAsciiDigits } from "@/lib/utils";

const text = (max: number) => z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1, "errors.required").max(max, "errors.textTooLong"));
const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim() || undefined : v ?? undefined), z.string().max(max, "errors.textTooLong").optional());
const toNumber = (v: unknown) => {
  if (typeof v === "number" || typeof v !== "string") return v;
  const s = toAsciiDigits(v).replace(/[,\s৳]/g, "");
  return s === "" ? undefined : Number(s);
};
const price = z.number({ error: "errors.priceInvalid" }).finite().positive("errors.priceInvalid").max(100_000_000, "errors.priceTooHigh");

export const officialPriceInputSchema = z
  .object({
    category: z.enum(OFFICIAL_CATEGORIES, { error: "errors.categoryRequired" }),
    source: z.enum(OFFICIAL_SOURCES, { error: "errors.required" }),
    itemBn: text(120),
    itemEn: text(120),
    productSlug: optionalText(80),
    priceMin: z.preprocess(toNumber, price),
    priceMax: z.preprocess(toNumber, price.optional()),
    quantity: z.preprocess((v) => (v === "" || v == null ? 1 : Number(toAsciiDigits(String(v)))), z.number().positive("errors.quantityInvalid").max(100_000)),
    unit: z.enum(UNIT_CODES, { error: "errors.unitInvalid" }),
    unitLabel: optionalText(60),
    area: text(80),
    effectiveDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "errors.dateInvalid")
      .refine((d) => !Number.isNaN(Date.parse(d)), "errors.dateInvalid")
      .refine((d) => d <= dhakaToday(), "errors.dateFuture"),
    sourceUrl: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.url({ protocol: /^https?$/, error: "errors.invalidInput" }).max(500).optional()),
    note: optionalText(300),
    isActive: z.preprocess((v) => v === undefined || v === true || v === "true" || v === "on" || v === "1", z.boolean()),
  })
  .refine((v) => v.priceMax === undefined || v.priceMax >= v.priceMin, { message: "errors.invalidInput", path: ["priceMax"] });

export type OfficialPriceInput = z.output<typeof officialPriceInputSchema>;

export const CSV_COLUMNS = [
  "category",
  "source",
  "item_bn",
  "item_en",
  "product_slug",
  "price_min",
  "price_max",
  "quantity",
  "unit",
  "unit_label",
  "area",
  "effective_date",
  "source_url",
  "note",
] as const;

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const text = input.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const camel = (h: string) => h.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase());

/** Maps CSV rows (header required) to raw input objects for validation. */
export function csvToInputs(csv: string): { line: number; raw: Record<string, string> }[] {
  const [header, ...rows] = parseCsv(csv);
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase());
  const missing = ["category", "source", "item_bn", "item_en", "price_min", "unit", "area", "effective_date"].filter((k) => !keys.includes(k));
  if (missing.length) throw new Error(`missing columns: ${missing.join(", ")}`);
  return rows.map((cells, i) => ({
    line: i + 2,
    raw: Object.fromEntries(keys.map((k, j) => [camel(k), cells[j]?.trim() ?? ""])),
  }));
}
