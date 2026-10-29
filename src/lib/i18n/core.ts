import { bn, type Messages } from "@/messages/bn";
import { en } from "@/messages/en";

export const LOCALES = ["bn", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "bn";
export const LOCALE_COOKIE = "lang";

export const dictionaries: Record<Locale, Messages> = { bn, en };

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

export type MessageKey = Paths<Messages>;
export type TranslateVars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: TranslateVars) => string;

export function isLocale(value: unknown): value is Locale {
  return value === "bn" || value === "en";
}

export function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

export function createTranslator(locale: Locale): Translate {
  const messages = dictionaries[locale];
  const numberFormat = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US");
  return (key, vars) => {
    const template = lookup(messages, key) ?? lookup(dictionaries[DEFAULT_LOCALE], key) ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = vars[name];
      if (value === undefined) return match;
      return typeof value === "number" ? numberFormat.format(value) : value;
    });
  };
}

/** Translates a key that may come from untyped sources (e.g. server error codes). */
export function translateLoose(t: Translate, key: string, fallback: MessageKey = "errors.server"): string {
  return lookup(dictionaries.en, key) !== undefined ? t(key as MessageKey) : t(fallback);
}

export function intlLocale(locale: Locale): string {
  return locale === "bn" ? "bn-BD" : "en-GB";
}

export function formatNumber(locale: Locale, value: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: maxFractionDigits }).format(value);
}

/** Formats a BDT amount as "৳১২০" / "৳120" (two decimals only when needed). */
export function formatTaka(locale: Locale, value: number): string {
  return `৳${formatNumber(locale, value, value < 10 ? 2 : value < 100 ? 1 : 0)}`;
}

export function formatDate(locale: Locale, value: string | Date): string {
  const date = typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00+06:00` : value) : value;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

export function formatDateTime(locale: Locale, value: string | Date): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(typeof value === "string" ? new Date(value) : value);
}

/** Picks the localized field of a bilingual record. */
export function localName(locale: Locale, record: { nameBn: string; nameEn: string }): string {
  return locale === "bn" ? record.nameBn : record.nameEn;
}
