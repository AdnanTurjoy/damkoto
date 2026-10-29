/**
 * Units of measurement and comparable unit-price normalisation.
 *
 * Only units of the same physical dimension are converted (g → kg, ml → l,
 * dozen → piece). Package-style units (packet, sack, cylinder, bhori, set,
 * other) are never converted; they are compared only against reports with the
 * same unit *and* the same variant/package description.
 */
export const UNIT_CODES = [
  "kg",
  "g",
  "l",
  "ml",
  "piece",
  "dozen",
  "hali",
  "packet",
  "sack",
  "cylinder",
  "bhori",
  "set",
  "m",
  "other",
] as const;

export type UnitCode = (typeof UNIT_CODES)[number];
export type BaseUnit = "kg" | "l" | "piece" | "m" | "packet" | "sack" | "cylinder" | "bhori" | "set" | "other";

interface UnitDefinition {
  base: BaseUnit;
  /** How many base units one of this unit represents. */
  factor: number;
}

const UNITS: Record<UnitCode, UnitDefinition> = {
  kg: { base: "kg", factor: 1 },
  g: { base: "kg", factor: 0.001 },
  l: { base: "l", factor: 1 },
  ml: { base: "l", factor: 0.001 },
  piece: { base: "piece", factor: 1 },
  dozen: { base: "piece", factor: 12 },
  hali: { base: "piece", factor: 4 },
  m: { base: "m", factor: 1 },
  packet: { base: "packet", factor: 1 },
  sack: { base: "sack", factor: 1 },
  cylinder: { base: "cylinder", factor: 1 },
  bhori: { base: "bhori", factor: 1 },
  set: { base: "set", factor: 1 },
  other: { base: "other", factor: 1 },
};

export function isUnitCode(value: unknown): value is UnitCode {
  return typeof value === "string" && (UNIT_CODES as readonly string[]).includes(value);
}

/** Units that can be meaningfully converted across package sizes. */
export function isConvertibleBase(base: BaseUnit): boolean {
  return base === "kg" || base === "l" || base === "piece" || base === "m";
}

export interface ComparableUnitPrice {
  baseUnit: BaseUnit;
  /** Price per one base unit, rounded to 4 decimals. */
  unitPrice: number;
}

/**
 * Computes price per base unit. `price` and `quantity` must be positive.
 * e.g. ৳30 for 500 g → ৳60 per kg; ৳150 per dozen → ৳12.5 per piece.
 */
export function comparableUnitPrice(price: number, quantity: number, unit: UnitCode): ComparableUnitPrice {
  if (!(price > 0) || !(quantity > 0)) {
    throw new RangeError("price and quantity must be positive");
  }
  const def = UNITS[unit];
  const baseQuantity = quantity * def.factor;
  return { baseUnit: def.base, unitPrice: Math.round((price / baseQuantity) * 10_000) / 10_000 };
}

export function baseUnitOf(unit: UnitCode): BaseUnit {
  return UNITS[unit].base;
}
