"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { OFFICIAL_CATEGORIES, OFFICIAL_SOURCES } from "@/db/schema";
import { useI18n } from "@/lib/i18n/client";
import { translateLoose, type MessageKey } from "@/lib/i18n/core";
import { dhakaToday } from "@/lib/utils";
import { emptyOfficialForm, type OfficialFormValue } from "../form-value";
import { UNIT_CODES } from "@/features/prices/units";
import { saveOfficialPriceAction } from "../actions";

export function OfficialPriceForm({ initial, products, onDone }: { initial: OfficialFormValue; products: { slug: string; nameBn: string; nameEn: string }[]; onDone?: () => void }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const p = initial.id ?? "new";
  const set = (k: keyof OfficialFormValue) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((s) => ({ ...s, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  const err = (k: string) => (errors[k] ? translateLoose(t, errors[k], "errors.invalidInput") : null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await saveOfficialPriceAction(v.id, v);
      if (!result.ok) {
        setErrors(result.fields ?? {});
        return toast(translateLoose(t, result.error), "error");
      }
      toast(t("admin.done"));
      if (!v.id) setV({ ...emptyOfficialForm(), category: v.category, source: v.source, area: v.area, effectiveDate: v.effectiveDate, sourceUrl: v.sourceUrl });
      onDone?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" noValidate>
      <Field id={`${p}-category`} label={t("filters.category")} error={err("category")}>
        <Select id={`${p}-category`} value={v.category} onChange={set("category")} className="h-10">
          {OFFICIAL_CATEGORIES.map((c) => <option key={c} value={c}>{t(`official.categories.${c}`)}</option>)}
        </Select>
      </Field>
      <Field id={`${p}-source`} label={t("official.source")} error={err("source")} className="lg:col-span-3">
        <Select id={`${p}-source`} value={v.source} onChange={set("source")} className="h-10">
          {OFFICIAL_SOURCES.map((s) => <option key={s} value={s}>{t(`official.sources.${s}` as MessageKey)}</option>)}
        </Select>
      </Field>
      <Field id={`${p}-itemBn`} label={t("admin.official.itemBn")} error={err("itemBn")} className="sm:col-span-2">
        <Input id={`${p}-itemBn`} value={v.itemBn} onChange={set("itemBn")} maxLength={120} className="h-10" />
      </Field>
      <Field id={`${p}-itemEn`} label={t("admin.official.itemEn")} error={err("itemEn")} className="sm:col-span-2">
        <Input id={`${p}-itemEn`} value={v.itemEn} onChange={set("itemEn")} maxLength={120} className="h-10" />
      </Field>
      <Field id={`${p}-priceMin`} label={t("admin.official.priceMin")} error={err("priceMin")}>
        <Input id={`${p}-priceMin`} inputMode="decimal" value={v.priceMin} onChange={set("priceMin")} className="h-10" />
      </Field>
      <Field id={`${p}-priceMax`} label={t("admin.official.priceMax")} error={err("priceMax")}>
        <Input id={`${p}-priceMax`} inputMode="decimal" value={v.priceMax} onChange={set("priceMax")} className="h-10" />
      </Field>
      <Field id={`${p}-quantity`} label={t("submit.quantity")} error={err("quantity")}>
        <Input id={`${p}-quantity`} inputMode="decimal" value={v.quantity} onChange={set("quantity")} className="h-10" />
      </Field>
      <Field id={`${p}-unit`} label={t("submit.unit")} error={err("unit")}>
        <Select id={`${p}-unit`} value={v.unit} onChange={set("unit")} className="h-10">
          {UNIT_CODES.map((u) => <option key={u} value={u}>{t(`units.${u}` as MessageKey)}</option>)}
        </Select>
      </Field>
      <Field id={`${p}-unitLabel`} label={t("admin.official.unitLabel")} hint={t("admin.official.unitLabelHint")} error={err("unitLabel")} className="sm:col-span-2">
        <Input id={`${p}-unitLabel`} value={v.unitLabel} onChange={set("unitLabel")} maxLength={60} className="h-10" />
      </Field>
      <Field id={`${p}-productSlug`} label={t("admin.official.productSlug")} hint={t("admin.official.productHint")} error={err("productSlug")} className="sm:col-span-2">
        <Select id={`${p}-productSlug`} value={v.productSlug} onChange={set("productSlug")} className="h-10">
          <option value="">{t("admin.official.noProduct")}</option>
          {products.map((x) => <option key={x.slug} value={x.slug}>{locale === "bn" ? x.nameBn : x.nameEn}</option>)}
        </Select>
      </Field>
      <Field id={`${p}-area`} label={t("official.area")} error={err("area")}>
        <Input id={`${p}-area`} value={v.area} onChange={set("area")} maxLength={80} placeholder={t("admin.official.areaPlaceholder")} className="h-10" />
      </Field>
      <Field id={`${p}-date`} label={t("admin.official.effectiveDate")} error={err("effectiveDate")}>
        <Input id={`${p}-date`} type="date" max={dhakaToday()} value={v.effectiveDate} onChange={set("effectiveDate")} className="h-10" />
      </Field>
      <Field id={`${p}-url`} label={t("admin.official.sourceUrl")} error={err("sourceUrl")} className="sm:col-span-2">
        <Input id={`${p}-url`} type="url" value={v.sourceUrl} onChange={set("sourceUrl")} placeholder="https://" className="h-10" />
      </Field>
      <Field id={`${p}-note`} label={t("admin.official.note")} error={err("note")} className="sm:col-span-2 lg:col-span-3">
        <Input id={`${p}-note`} value={v.note} onChange={set("note")} maxLength={300} className="h-10" />
      </Field>
      <div className="flex items-end justify-between gap-3">
        <Checkbox label={v.isActive ? t("admin.official.active") : t("admin.official.inactive")} checked={v.isActive} onChange={set("isActive")} />
        <Button type="submit" size="sm" disabled={pending}>{t("common.save")}</Button>
      </div>
    </form>
  );
}
