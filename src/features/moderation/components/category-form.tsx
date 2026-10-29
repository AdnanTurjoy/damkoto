"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CATEGORY_ICON_NAMES } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { translateLoose, type MessageKey } from "@/lib/i18n/core";
import { UNIT_CODES } from "@/features/prices/units";
import { saveCategoryAction } from "../actions";

export interface CategoryFormValue {
  id: string | null;
  slug: string;
  nameBn: string;
  nameEn: string;
  parentId: string | null;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  suggestedUnits: string[];
}

export function CategoryForm({ value, parents, disabled }: { value: CategoryFormValue; parents: { id: string; name: string }[]; disabled: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [state, setState] = useState(value);
  const [pending, startTransition] = useTransition();
  const p = state.id ?? "new";
  const set = <K extends keyof CategoryFormValue>(k: K, v: CategoryFormValue[K]) => setState((s) => ({ ...s, [k]: v }));

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveCategoryAction(state.id, { ...state, parentId: state.parentId ?? "" });
      if (!result.ok) return toast(translateLoose(t, result.error), "error");
      toast(t("admin.done"));
      if (!state.id) setState(value);
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <fieldset disabled={disabled || pending} className="contents">
        <div><Label htmlFor={`${p}-slug`}>{t("admin.categories.slug")}</Label><Input id={`${p}-slug`} value={state.slug} onChange={(e) => set("slug", e.target.value)} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className="h-10" /></div>
        <div><Label htmlFor={`${p}-bn`}>{t("admin.categories.nameBn")}</Label><Input id={`${p}-bn`} value={state.nameBn} onChange={(e) => set("nameBn", e.target.value)} required className="h-10" /></div>
        <div><Label htmlFor={`${p}-en`}>{t("admin.categories.nameEn")}</Label><Input id={`${p}-en`} value={state.nameEn} onChange={(e) => set("nameEn", e.target.value)} required className="h-10" /></div>
        <div>
          <Label htmlFor={`${p}-parent`}>{t("admin.categories.parent")}</Label>
          <Select id={`${p}-parent`} value={state.parentId ?? ""} onChange={(e) => set("parentId", e.target.value || null)} className="h-10">
            <option value="">{t("admin.categories.none")}</option>
            {parents.filter((x) => x.id !== state.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${p}-icon`}>{t("admin.categories.icon")}</Label>
          <Select id={`${p}-icon`} value={state.icon} onChange={(e) => set("icon", e.target.value)} className="h-10">
            {CATEGORY_ICON_NAMES.map((i) => <option key={i} value={i}>{i}</option>)}
          </Select>
        </div>
        <div><Label htmlFor={`${p}-sort`}>{t("admin.categories.sortOrder")}</Label><Input id={`${p}-sort`} type="number" min={0} max={1000} value={state.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} className="h-10" /></div>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-semibold">{t("admin.categories.units")}</p>
          <div className="flex flex-wrap gap-x-3">
            {UNIT_CODES.map((u) => (
              <Checkbox key={u} className="min-h-8 text-sm" label={t(`units.${u}` as MessageKey)} checked={state.suggestedUnits.includes(u)} onChange={(e) => set("suggestedUnits", e.target.checked ? [...state.suggestedUnits, u] : state.suggestedUnits.filter((x) => x !== u))} />
            ))}
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 sm:col-span-2 lg:col-span-4">
          <Checkbox label={state.isActive ? t("admin.categories.active") : t("admin.categories.inactive")} checked={state.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          <Button type="submit" size="sm">{t("admin.categories.save")}</Button>
        </div>
      </fieldset>
    </form>
  );
}
