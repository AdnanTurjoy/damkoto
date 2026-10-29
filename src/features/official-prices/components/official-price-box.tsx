import { ExternalLink, Landmark } from "lucide-react";
import Link from "next/link";
import { formatDate, formatTaka, type Locale, type MessageKey, type Translate } from "@/lib/i18n/core";
import { cn } from "@/lib/utils";
import { isOfficialStale, officialPriceText, officialUnitText } from "../format";
import type { OfficialPrice } from "../service";

/** Official reference beside community data; never merged into community statistics. */
export function OfficialPriceBox({ prices, t, locale, className }: { prices: OfficialPrice[]; t: Translate; locale: Locale; className?: string }) {
  if (!prices.length) return null;
  return (
    <section aria-labelledby="official-box" className={cn("rounded-2xl border border-sky-200 bg-sky-50/70 p-4", className)}>
      <h2 id="official-box" className="flex items-center gap-2 font-bold text-sky-900">
        <Landmark className="size-4.5" aria-hidden /> {t("official.boxTitle")}
      </h2>
      <p className="text-xs text-sky-900/80">{t("official.boxHint")}</p>
      <ul className="mt-3 space-y-2.5">
        {prices.slice(0, 4).map((p) => (
          <li key={p.id} className="text-sm">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-base font-bold tabular-nums text-sky-950">{officialPriceText(locale, p)}</span>
              <span className="text-sky-900/80">{officialUnitText(locale, t, p)}</span>
              {p.unitMin !== null && p.quantity !== 1 && p.baseUnit && (
                <span className="text-xs text-sky-900/70">≈ {formatTaka(locale, p.unitMin)}/{t(`units.${p.baseUnit}` as MessageKey)}</span>
              )}
            </p>
            <p className="text-xs text-sky-900/80">
              {locale === "bn" ? p.itemBn : p.itemEn} · {p.area} · {t(`official.sources.${p.source}` as MessageKey)} · {t("official.publishedOn", { date: formatDate(locale, p.effectiveDate) })}
              {isOfficialStale(p.effectiveDate) && <span className="ml-1 font-semibold text-amber-700">· {t("official.old")}</span>}
            </p>
            {p.sourceUrl && (
              <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-800 underline">
                {t("official.viewSource")} <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ul>
      <Link href="/official-prices" className="mt-3 inline-block text-xs font-semibold text-sky-800 hover:underline">
        {t("official.title")} →
      </Link>
    </section>
  );
}
