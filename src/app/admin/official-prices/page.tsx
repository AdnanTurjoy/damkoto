import { asc } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { products } from "@/db/schema";
import { ActiveToggle, CsvImport, EditOfficialPrice } from "@/features/official-prices/components/official-admin-tools";
import { OfficialPriceForm } from "@/features/official-prices/components/official-price-form";
import { emptyOfficialForm, type OfficialFormValue } from "@/features/official-prices/form-value";
import { officialPriceText, officialUnitText } from "@/features/official-prices/format";
import { listOfficialPrices, type OfficialPrice } from "@/features/official-prices/service";
import { staffPageGuard } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formatDate, type MessageKey } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const toForm = (p: OfficialPrice): OfficialFormValue => ({
  id: p.id,
  category: p.category,
  source: p.source,
  itemBn: p.itemBn,
  itemEn: p.itemEn,
  productSlug: p.productSlug ?? "",
  priceMin: String(p.priceMin),
  priceMax: p.priceMax === null ? "" : String(p.priceMax),
  quantity: String(p.quantity),
  unit: p.unit,
  unitLabel: p.unitLabel ?? "",
  area: p.area,
  effectiveDate: p.effectiveDate,
  sourceUrl: p.sourceUrl ?? "",
  note: p.note ?? "",
  isActive: p.isActive,
});

export default async function AdminOfficialPricesPage({ searchParams }: PageProps<"/admin/official-prices">) {
  await staffPageGuard();
  const { t, locale } = await getI18n();
  const sp = await searchParams;
  const history = sp.history === "1";
  const hidden = sp.hidden === "1";
  const db = await getDb();
  const [rows, catalog] = await Promise.all([
    listOfficialPrices(db, { includeInactive: hidden, latestOnly: !history }),
    db.select({ slug: products.slug, nameBn: products.nameBn, nameEn: products.nameEn }).from(products).orderBy(asc(products.nameEn)),
  ]);
  const toggle = (key: "history" | "hidden", on: boolean, label: string) => {
    const params = new URLSearchParams({ ...(history ? { history: "1" } : {}), ...(hidden ? { hidden: "1" } : {}) });
    if (on) params.delete(key);
    else params.set(key, "1");
    return (
      <Link href={`/admin/official-prices${params.size ? `?${params}` : ""}`} aria-pressed={on} className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", on ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white")}>
        {label}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t("admin.official.title")}</h2>
        <p className="text-sm text-muted">{t("admin.official.intro")}</p>
      </div>
      <Card className="p-5">
        <h3 className="mb-3 font-bold">{t("admin.official.add")}</h3>
        <OfficialPriceForm initial={emptyOfficialForm()} products={catalog} />
      </Card>
      <Card className="p-5">
        <details>
          <summary className="cursor-pointer font-bold">{t("admin.official.import")}</summary>
          <div className="mt-3">
            <CsvImport />
          </div>
        </details>
      </Card>
      <div className="flex flex-wrap gap-2">
        {toggle("history", history, t("admin.official.history"))}
        {toggle("hidden", hidden, t("admin.official.showHidden"))}
      </div>
      {rows.length === 0 ? (
        <Card className="p-6 text-muted">{t("admin.empty")}</Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => (
            <li key={p.id}>
              <Card className={cn("p-4", !p.isActive && "opacity-60")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {locale === "bn" ? p.itemBn : p.itemEn} <span className="font-normal text-muted">· {p.area}</span>
                    </p>
                    <p className="text-sm">
                      <span className="font-bold tabular-nums text-brand-700">{officialPriceText(locale, p)}</span> {officialUnitText(locale, t, p)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <Badge>{t(`official.categories.${p.category}`)}</Badge>
                      <span>{t(`official.sources.${p.source}` as MessageKey)}</span>
                      <span>· {formatDate(locale, p.effectiveDate)}</span>
                      {p.productSlug && <Badge tone="brand">{p.productSlug}</Badge>}
                      {!p.isActive && <Badge tone="red">{t("admin.official.inactive")}</Badge>}
                      {p.sourceUrl && (
                        <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 underline">
                          {t("official.viewSource")} <ExternalLink className="size-3" aria-hidden />
                        </a>
                      )}
                    </div>
                  </div>
                  <ActiveToggle id={p.id} isActive={p.isActive} />
                </div>
                <EditOfficialPrice initial={toForm(p)} products={catalog} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
