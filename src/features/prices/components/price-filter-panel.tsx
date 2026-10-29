"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Label, Select } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { localName, type MessageKey } from "@/lib/i18n/core";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/features/categories/queries";
import type { LocationOption } from "@/features/locations/queries";
import { useUpazilas } from "@/features/locations/components/use-upazilas";
import { PERIODS } from "../filters";
import { UNIT_CODES } from "../units";
import { useFilterUrl } from "./use-filter-url";

interface Props {
  categories: CategoryNode[];
  divisions: LocationOption[];
  districts: LocationOption[];
  resultCount?: number;
}

const COMPARABLE_UNITS = ["kg", "l", "piece", "m", "cylinder", "packet", "sack", "bhori", "set"] as const;

/** Debounced text input bound to a URL parameter. */
function DebouncedInput({ name, value, onCommit, ...props }: { name: string; value: string; onCommit: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [local, setLocal] = useState(value);
  const [synced, setSynced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Follow external URL changes (e.g. "clear all") without an effect.
  if (value !== synced) {
    setSynced(value);
    setLocal(value);
  }
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Input
      name={name}
      value={local}
      onChange={(e) => {
        const next = e.target.value;
        setLocal(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => onCommit(next.trim()), 450);
      }}
      {...props}
    />
  );
}

function FilterFields({ categories, divisions, districts, prefix }: Props & { prefix: string }) {
  const { locale, t } = useI18n();
  const { searchParams, update } = useFilterUrl();
  const get = (key: string) => searchParams.get(key) ?? "";
  const division = get("division");
  const district = get("district");
  const period = get("period") || "any";
  const upazilas = useUpazilas(district ? Number(district) : null);
  const visibleDistricts = division ? districts.filter((d) => String(d.parentId) === division) : districts;
  const toggle = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => update({ [key]: e.target.checked ? "1" : undefined });

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{t("filters.product")}</legend>
        <div>
          <Label htmlFor={`${prefix}-q`}>{t("filters.q")}</Label>
          <DebouncedInput id={`${prefix}-q`} name="q" type="search" value={get("q")} onCommit={(v) => update({ q: v })} />
        </div>
        <div>
          <Label htmlFor={`${prefix}-category`}>{t("filters.category")}</Label>
          <Select id={`${prefix}-category`} value={get("category")} onChange={(e) => update({ category: e.target.value })}>
            <option value="">{t("filters.allCategories")}</option>
            {categories.map((c) => (
              <optgroup key={c.id} label={localName(locale, c)}>
                <option value={c.slug}>{localName(locale, c)}</option>
                {c.children.map((child) => (
                  <option key={child.id} value={child.slug}>
                    — {localName(locale, child)}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${prefix}-brand`}>{t("filters.brand")}</Label>
            <DebouncedInput id={`${prefix}-brand`} name="brand" value={get("brand")} onCommit={(v) => update({ brand: v })} />
          </div>
          <div>
            <Label htmlFor={`${prefix}-variant`}>{t("filters.variant")}</Label>
            <DebouncedInput id={`${prefix}-variant`} name="variant" value={get("variant")} onCommit={(v) => update({ variant: v })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${prefix}-unit`}>{t("filters.unit")}</Label>
            <Select id={`${prefix}-unit`} value={get("unit")} onChange={(e) => update({ unit: e.target.value })}>
              <option value="">{t("filters.anyUnit")}</option>
              {UNIT_CODES.map((u) => (
                <option key={u} value={u}>
                  {t(`units.${u}` as MessageKey)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`${prefix}-condition`}>{t("filters.condition")}</Label>
            <Select id={`${prefix}-condition`} value={get("condition")} onChange={(e) => update({ condition: e.target.value })}>
              <option value="">{t("filters.any")}</option>
              <option value="new">{t("conditions.new")}</option>
              <option value="used">{t("conditions.used")}</option>
            </Select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{t("filters.location")}</legend>
        <div>
          <Label htmlFor={`${prefix}-division`}>{t("filters.division")}</Label>
          <Select id={`${prefix}-division`} value={division} onChange={(e) => update({ division: e.target.value, district: undefined, upazila: undefined })}>
            <option value="">{t("filters.allDivisions")}</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {localName(locale, d)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${prefix}-district`}>{t("filters.district")}</Label>
          <Select id={`${prefix}-district`} value={district} onChange={(e) => update({ district: e.target.value, upazila: undefined })}>
            <option value="">{t("filters.allDistricts")}</option>
            {visibleDistricts.map((d) => (
              <option key={d.id} value={d.id}>
                {localName(locale, d)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${prefix}-upazila`}>{t("filters.upazila")}</Label>
          <Select id={`${prefix}-upazila`} value={get("upazila")} disabled={!district} onChange={(e) => update({ upazila: e.target.value })}>
            <option value="">{t("filters.allUpazilas")}</option>
            {upazilas.map((u) => (
              <option key={u.id} value={u.id}>
                {localName(locale, u)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${prefix}-locality`}>{t("filters.locality")}</Label>
            <DebouncedInput id={`${prefix}-locality`} name="locality" value={get("locality")} onCommit={(v) => update({ locality: v })} />
          </div>
          <div>
            <Label htmlFor={`${prefix}-market`}>{t("filters.market")}</Label>
            <DebouncedInput id={`${prefix}-market`} name="market" value={get("market")} onCommit={(v) => update({ market: v })} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{t("filters.price")}</legend>
        <div>
          <Label htmlFor={`${prefix}-base`}>{t("filters.comparableUnit")}</Label>
          <Select id={`${prefix}-base`} value={get("base")} onChange={(e) => update({ base: e.target.value })}>
            <option value="">{t("filters.anyUnit")}</option>
            {COMPARABLE_UNITS.map((u) => (
              <option key={u} value={u}>
                {t("common.perUnit", { unit: t(`units.${u}` as MessageKey) })}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${prefix}-min`}>{t("filters.priceMin")}</Label>
            <DebouncedInput id={`${prefix}-min`} name="minPrice" inputMode="decimal" value={get("minPrice")} onCommit={(v) => update({ minPrice: v })} />
          </div>
          <div>
            <Label htmlFor={`${prefix}-max`}>{t("filters.priceMax")}</Label>
            <DebouncedInput id={`${prefix}-max`} name="maxPrice" inputMode="decimal" value={get("maxPrice")} onCommit={(v) => update({ maxPrice: v })} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{t("filters.period")}</legend>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => update({ period: p === "any" ? undefined : p, ...(p !== "custom" ? { from: undefined, to: undefined } : {}) })}
              className={cn(
                "min-h-9 cursor-pointer rounded-full border px-3 text-sm font-semibold transition-colors",
                period === p ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white hover:border-brand-300",
              )}
            >
              {t(`filters.periods.${p}` as MessageKey)}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${prefix}-from`}>{t("filters.from")}</Label>
              <Input id={`${prefix}-from`} type="date" value={get("from")} onChange={(e) => update({ from: e.target.value })} />
            </div>
            <div>
              <Label htmlFor={`${prefix}-to`}>{t("filters.to")}</Label>
              <Input id={`${prefix}-to`} type="date" value={get("to")} onChange={(e) => update({ to: e.target.value })} />
            </div>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{t("filters.more")}</legend>
        <Checkbox label={t("filters.hasImage")} checked={get("hasImage") === "1"} onChange={toggle("hasImage")} />
        <Checkbox label={t("filters.hasComments")} checked={get("hasComments") === "1"} onChange={toggle("hasComments")} />
        <Checkbox label={t("filters.named")} checked={get("named") === "1"} onChange={toggle("named")} />
        <Checkbox label={t("filters.hasMarket")} checked={get("hasMarket") === "1"} onChange={toggle("hasMarket")} />
      </fieldset>
    </div>
  );
}

/** Sidebar on desktop, bottom sheet on mobile — one implementation for list and map. */
export function PriceFilterPanel({ alwaysSheet = false, ...props }: Props & { alwaysSheet?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { pending, searchParams } = useFilterUrl();
  const activeCount = [...searchParams.keys()].filter((k) => !["sort", "page", "bbox"].includes(k)).length;
  return (
    <>
      <div className={alwaysSheet ? "" : "lg:hidden"}>
        <Button variant="outline" onClick={() => setOpen(true)} className={alwaysSheet ? "" : "w-full"}>
          <SlidersHorizontal /> {t("filters.show")}
          {activeCount > 0 && <span className="rounded-full bg-brand-600 px-2 text-xs text-white">{activeCount}</span>}
        </Button>
        <Dialog open={open} onClose={() => setOpen(false)} title={t("filters.title")} closeLabel={t("common.close")} variant="sheet">
          {open && <FilterFields {...props} prefix="m" />}
          <div className="sticky bottom-0 -mx-5 mt-6 border-t border-line bg-white px-5 pt-3 pb-1">
            <Button className="w-full" onClick={() => setOpen(false)}>
              {props.resultCount !== undefined ? t("prices.results", { count: props.resultCount }) : t("filters.apply")}
            </Button>
          </div>
        </Dialog>
      </div>
      {!alwaysSheet && (
        <aside aria-label={t("filters.title")} className={cn("hidden lg:block", pending && "opacity-70")}>
          <FilterFields {...props} prefix="d" />
        </aside>
      )}
    </>
  );
}

export function SortSelect() {
  const { t } = useI18n();
  const { searchParams, update } = useFilterUrl();
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="sort" className="mb-0 shrink-0 text-sm text-muted">
        {t("filters.sort")}
      </Label>
      <Select id="sort" value={searchParams.get("sort") ?? "recent"} onChange={(e) => update({ sort: e.target.value === "recent" ? undefined : e.target.value })} className="h-10 w-auto min-w-48">
        {(["recent", "oldest", "unit_asc", "unit_desc", "discussed", "sample"] as const).map((s) => (
          <option key={s} value={s}>
            {t(`filters.sorts.${s}`)}
          </option>
        ))}
      </Select>
    </div>
  );
}
