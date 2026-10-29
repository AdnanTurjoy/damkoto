import { z } from "zod";
import { UNIT_CODES } from "@/features/prices/units";
import { daysBetween, dhakaToday, toAsciiDigits } from "@/lib/utils";
import { siteConfig } from "@/config/site";

/** Error messages are translation keys (see messages/*.ts → errors). */
const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") || undefined : v ?? undefined),
    z.string().max(max, "errors.textTooLong").optional(),
  );

const positiveNumber = (message: string, max: number, maxMessage = message) =>
  z.preprocess(
    (v) => {
      if (typeof v === "number") return v;
      if (typeof v !== "string") return v;
      const s = toAsciiDigits(v).replace(/[,\s৳]/g, "");
      return s === "" ? undefined : Number(s);
    },
    z.number({ error: message }).finite(message).positive(message).max(max, maxMessage),
  );

const optionalInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().int().positive().optional(),
);

const [south, west, north, east] = siteConfig.map.bounds;

export const locationInputSchema = z
  .object({
    divisionId: optionalInt,
    districtId: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
      z.number({ error: "errors.locationRequired" }).int("errors.locationRequired").positive("errors.locationRequired"),
    ),
    upazilaId: optionalInt,
    locality: optionalText(100),
    lat: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(south).max(north).optional()),
    lng: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(west).max(east).optional()),
    method: z.enum(["admin", "map", "gps"]).default("admin"),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), { message: "errors.coordinatesInvalid", path: ["lat"] });

export const priceReportInputSchema = z
  .object({
    productName: z.preprocess(
      (v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : v),
      z.string({ error: "errors.productNameRequired" }).min(1, "errors.productNameRequired").max(120, "errors.textTooLong"),
    ),
    categoryId: z.uuid({ error: "errors.categoryRequired" }),
    price: positiveNumber("errors.priceInvalid", 10_000_000, "errors.priceTooHigh"),
    quantity: positiveNumber("errors.quantityInvalid", 100_000),
    unit: z.enum(UNIT_CODES, { error: "errors.unitInvalid" }),
    packageDescription: optionalText(80),
    brand: optionalText(60),
    variant: optionalText(80),
    marketName: optionalText(100),
    condition: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["new", "used"]).optional()),
    note: optionalText(500),
    displayName: optionalText(40),
    purchaseDate: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "errors.dateInvalid")
        .refine((d) => !Number.isNaN(Date.parse(d)), "errors.dateInvalid")
        .refine((d) => daysBetween(dhakaToday(), d) <= 0, "errors.dateFuture")
        .refine((d) => daysBetween(d, dhakaToday()) <= 365, "errors.dateTooOld")
        .optional(),
    ),
    imageUrl: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.url({ error: "errors.imageInvalid" }).startsWith("https://res.cloudinary.com/", "errors.imageInvalid").optional(),
    ),
    imageWidth: optionalInt,
    imageHeight: optionalInt,
    location: locationInputSchema,
  })
  .refine((v) => v.unit !== "other" || Boolean(v.packageDescription), {
    message: "errors.packageRequired",
    path: ["packageDescription"],
  });

export type PriceReportInput = z.output<typeof priceReportInputSchema>;
export type PriceReportFormValues = z.input<typeof priceReportInputSchema>;

/** Flattens Zod issues into { "location.districtId": "errors.locationRequired" }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message.startsWith("errors.") ? issue.message : "errors.invalidInput";
  }
  return out;
}
