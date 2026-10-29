import { Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { localName, type Locale, type Translate } from "@/lib/i18n/core";
import type { LocationOption } from "@/features/locations/queries";

/** Plain GET form: works without JavaScript and lands on real filtered results. */
export function HeroSearch({
  t,
  locale,
  districts,
  suggestions,
}: {
  t: Translate;
  locale: Locale;
  districts: LocationOption[];
  suggestions: { nameBn: string; nameEn: string }[];
}) {
  const quick = locale === "bn" ? ["আলু", "পেঁয়াজ", "ডিম", "সয়াবিন তেল", "কাঁচামরিচ", "LPG"] : ["Potato", "Onion", "Eggs", "Soybean oil", "Green chilli", "LPG"];
  return (
    <div>
      <form action="/prices" role="search" className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-2 shadow-[var(--shadow-lift)] sm:flex-row">
        <label htmlFor="hero-q" className="sr-only">
          {t("home.searchLabel")}
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="hero-q"
            name="q"
            list="hero-products"
            autoComplete="off"
            placeholder={t("home.searchPlaceholder")}
            className="h-12 w-full rounded-xl bg-transparent pl-11 pr-3 text-base placeholder:text-muted/80 focus:outline-none"
          />
          <datalist id="hero-products">
            {suggestions.map((s) => (
              <option key={s.nameEn} value={localName(locale, s)} />
            ))}
          </datalist>
        </div>
        <label htmlFor="hero-district" className="sr-only">
          {t("filters.district")}
        </label>
        <Select id="hero-district" name="district" defaultValue="" className="h-12 border-0 bg-paper sm:w-44">
          <option value="">{t("home.searchDistrict")}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {localName(locale, d)}
            </option>
          ))}
        </Select>
        <Button type="submit" size="lg" className="h-12">
          <Search /> {t("common.search")}
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t("home.quickSearches")}</span>
        {quick.map((q) => (
          <Link key={q} href={`/prices?q=${encodeURIComponent(q)}`} className="rounded-full border border-line bg-white px-3 py-1 font-medium hover:border-brand-300 hover:bg-brand-50">
            {q}
          </Link>
        ))}
      </div>
    </div>
  );
}
