"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ImagePlus, Loader2, PackageSearch, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { formatTaka, localName, translateLoose, type MessageKey } from "@/lib/i18n/core";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/images";
import { dhakaToday, toAsciiDigits } from "@/lib/utils";
import type { CategoryNode, ProductSuggestion } from "@/features/categories/queries";
import { LocationSelector, type LocationValue } from "@/features/locations/components/location-selector";
import type { LocationOption } from "@/features/locations/queries";
import { priceReportInputSchema } from "@/schemas/price-report";
import { submitPriceReportAction, updatePriceReportAction } from "../actions";
import { comparableUnitPrice, isConvertibleBase, isUnitCode, UNIT_CODES } from "../units";

export interface PriceFormState {
  productName: string;
  categoryId: string;
  price: string;
  quantity: string;
  unit: string;
  packageDescription: string;
  brand: string;
  variant: string;
  marketName: string;
  condition: string;
  note: string;
  displayName: string;
  purchaseDate: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  location: LocationValue;
}

export const emptyPriceForm: PriceFormState = {
  productName: "",
  categoryId: "",
  price: "",
  quantity: "1",
  unit: "kg",
  packageDescription: "",
  brand: "",
  variant: "",
  marketName: "",
  condition: "",
  note: "",
  displayName: "",
  purchaseDate: "",
  imageUrl: "",
  location: { divisionId: "", districtId: "", upazilaId: "", locality: "", method: "admin" },
};

interface Props {
  categories: CategoryNode[];
  divisions: LocationOption[];
  districts: LocationOption[];
  imageUploads: boolean;
  initial?: PriceFormState;
  reportId?: string;
}

export function PriceReportForm({ categories, divisions, districts, imageUploads, initial, reportId }: Props) {
  const { locale, t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState<{ id: string; status: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<PriceFormState>({
    defaultValues: initial ?? emptyPriceForm,
    resolver: zodResolver(priceReportInputSchema) as unknown as Resolver<PriceFormState>,
    mode: "onTouched",
  });
  const { register, control, handleSubmit, setValue, setError, formState, reset } = form;
  const errors = formState.errors;
  const err = (message?: string) => (message ? translateLoose(t, message, "errors.invalidInput") : null);

  const [categoryId, unit, price, quantity, imageUrl] = useWatch({ control, name: ["categoryId", "unit", "price", "quantity", "imageUrl"] });
  const allCategories = categories.flatMap((c) => [c, ...c.children]);
  const suggestedUnits = allCategories.find((c) => c.id === categoryId)?.suggestedUnits ?? [];
  const orderedUnits = [...suggestedUnits.filter(isUnitCode), ...UNIT_CODES.filter((u) => !suggestedUnits.includes(u))];

  const priceNum = Number(toAsciiDigits(String(price ?? "")).replace(/[,\s]/g, ""));
  const qtyNum = Number(toAsciiDigits(String(quantity ?? "")));
  const preview =
    priceNum > 0 && qtyNum > 0 && isUnitCode(unit) && isConvertibleBase(comparableUnitPrice(priceNum, qtyNum, unit).baseUnit)
      ? comparableUnitPrice(priceNum, qtyNum, unit)
      : null;

  function onValid(values: PriceFormState) {
    setFormError(null);
    startTransition(async () => {
      const result = reportId ? await updatePriceReportAction(reportId, values) : await submitPriceReportAction(values);
      if (!result.ok) {
        setFormError(translateLoose(t, result.error));
        for (const [field, message] of Object.entries(result.fields ?? {})) {
          setError(field as keyof PriceFormState, { message });
        }
        return;
      }
      toast(t("submit.successTitle"));
      if (reportId) {
        router.push(`/prices/${reportId}`);
        router.refresh();
      } else {
        setSuccess(result.data);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (success) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <CheckCircle2 className="mx-auto size-14 text-brand-600" aria-hidden />
        <h2 className="mt-4 text-2xl font-bold">{t("submit.successTitle")}</h2>
        <p className="mt-2 text-muted">{success.status === "published" ? t("submit.successPublished") : t("submit.successPending")}</p>
        <p className="mt-1 text-sm text-muted">{t("submit.noVerifyNote")}</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href={`/prices/${success.id}`} className={buttonClasses("primary")}>
            {t("submit.viewReport")}
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              reset({ ...emptyPriceForm, location: form.getValues("location"), displayName: form.getValues("displayName") });
              setSuccess(null);
            }}
          >
            {t("submit.addAnother")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onValid, () => setFormError(t("errors.invalidInput")))} noValidate className="space-y-6">
      <Section number={1} title={t("submit.sectionProduct")}>
        <Controller
          control={control}
          name="productName"
          render={({ field }) => (
            <ProductNameInput
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={err(errors.productName?.message)}
              onPick={(s) => {
                field.onChange(locale === "bn" ? s.nameBn : s.nameEn);
                if (s.categoryId) setValue("categoryId", s.categoryId, { shouldValidate: true });
                if (s.defaultUnit && isUnitCode(s.defaultUnit)) setValue("unit", s.defaultUnit);
              }}
            />
          )}
        />
        <Field id="categoryId" label={t("submit.category")} error={err(errors.categoryId?.message)}>
          <Select id="categoryId" aria-invalid={Boolean(errors.categoryId)} {...register("categoryId")}>
            <option value="">{t("submit.chooseCategory")}</option>
            {categories.map((c) => (
              <optgroup key={c.id} label={localName(locale, c)}>
                <option value={c.id}>{localName(locale, c)}</option>
                {c.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    — {localName(locale, child)}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
      </Section>

      <Section number={2} title={t("submit.sectionPrice")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="price" label={t("submit.price")} error={err(errors.price?.message)}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted">৳</span>
              <Input id="price" inputMode="decimal" autoComplete="off" placeholder={t("submit.pricePlaceholder")} className="pl-8 text-lg font-semibold" aria-invalid={Boolean(errors.price)} {...register("price")} />
            </div>
          </Field>
          <Field id="quantity" label={t("submit.quantity")} error={err(errors.quantity?.message)}>
            <Input id="quantity" inputMode="decimal" autoComplete="off" aria-invalid={Boolean(errors.quantity)} {...register("quantity")} />
          </Field>
          <Field id="unit" label={t("submit.unit")} error={err(errors.unit?.message)}>
            <Select id="unit" {...register("unit")}>
              {orderedUnits.map((u) => (
                <option key={u} value={u}>
                  {t(`units.${u}` as MessageKey)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {preview && (
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800" aria-live="polite">
            {t("submit.unitPricePreview", {
              price: formatTaka(locale, preview.unitPrice),
              per: t("common.perUnit", { unit: t(`units.${preview.baseUnit}` as MessageKey) }),
            })}
          </p>
        )}
        <Field
          id="packageDescription"
          label={t("submit.packageDescription")}
          optionalLabel={unit === "other" ? undefined : t("common.optional")}
          hint={t("submit.packageHint")}
          error={err(errors.packageDescription?.message)}
        >
          <Input id="packageDescription" maxLength={80} aria-invalid={Boolean(errors.packageDescription)} {...register("packageDescription")} />
        </Field>
      </Section>

      <Section number={3} title={t("submit.sectionLocation")}>
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <LocationSelector
              idPrefix="loc"
              value={field.value}
              onChange={field.onChange}
              divisions={divisions}
              districts={districts}
              errors={{
                districtId: errors.location?.districtId?.message,
                divisionId: errors.location?.divisionId?.message,
                upazilaId: errors.location?.upazilaId?.message,
                lat: errors.location?.lat?.message,
              }}
            />
          )}
        />
        <Field id="marketName" label={t("submit.market")} optionalLabel={t("common.optional")} error={err(errors.marketName?.message)}>
          <Input id="marketName" maxLength={100} placeholder={t("submit.marketPlaceholder")} {...register("marketName")} />
        </Field>
        <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("submit.privacyNote")}
        </p>
      </Section>

      <Section number={4} title={t("submit.sectionMore")} hint={t("submit.sectionMoreHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="brand" label={t("submit.brand")} optionalLabel={t("common.optional")} error={err(errors.brand?.message)}>
            <Input id="brand" maxLength={60} {...register("brand")} />
          </Field>
          <Field id="variant" label={t("submit.variant")} optionalLabel={t("common.optional")} hint={t("submit.variantHint")} error={err(errors.variant?.message)}>
            <Input id="variant" maxLength={80} {...register("variant")} />
          </Field>
          <Field id="purchaseDate" label={t("submit.purchaseDate")} optionalLabel={t("common.optional")} error={err(errors.purchaseDate?.message)}>
            <Input id="purchaseDate" type="date" max={dhakaToday()} aria-invalid={Boolean(errors.purchaseDate)} {...register("purchaseDate")} />
          </Field>
          <Field id="condition" label={t("submit.condition")} optionalLabel={t("common.optional")}>
            <Select id="condition" {...register("condition")}>
              <option value="">{t("submit.conditionNA")}</option>
              <option value="new">{t("conditions.new")}</option>
              <option value="used">{t("conditions.used")}</option>
            </Select>
          </Field>
        </div>
        <Field id="note" label={t("submit.note")} optionalLabel={t("common.optional")} error={err(errors.note?.message)}>
          <Textarea id="note" maxLength={500} rows={3} placeholder={t("submit.notePlaceholder")} {...register("note")} />
        </Field>
        <Field id="displayName" label={t("submit.displayName")} optionalLabel={t("common.optional")} hint={t("submit.displayNameHint")} error={err(errors.displayName?.message)}>
          <Input id="displayName" maxLength={40} autoComplete="nickname" {...register("displayName")} />
        </Field>
        <ImageField
          enabled={imageUploads}
          url={imageUrl}
          onChange={(img) => {
            setValue("imageUrl", img?.url ?? "");
            setValue("imageWidth", img?.width);
            setValue("imageHeight", img?.height);
          }}
        />
      </Section>

      {formError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] font-medium text-red-700">
          {formError}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">{t("submit.noVerifyNote")}</p>
        <Button type="submit" variant="accent" size="lg" disabled={pending} className="sm:min-w-52">
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? t("submit.submitting") : reportId ? t("submit.update") : t("submit.submit")}
        </Button>
      </div>
    </form>
  );
}

function Section({ number, title, hint, children }: { number: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{number}</span>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {hint && <p className="text-sm text-muted">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function ProductNameInput({
  value,
  onChange,
  onBlur,
  onPick,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  onPick: (s: ProductSuggestion) => void;
  error: string | null;
}) {
  const { locale, t } = useI18n();
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function query(text: string) {
    clearTimeout(timer.current);
    if (text.trim().length < 1) return setSuggestions([]);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/suggest?q=${encodeURIComponent(text)}`);
        const json = (await res.json()) as { ok: boolean; data?: ProductSuggestion[] };
        setSuggestions(json.ok ? (json.data ?? []) : []);
        setOpen(true);
        setActive(-1);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }

  function pick(s: ProductSuggestion) {
    onPick(s);
    setOpen(false);
  }

  const listId = "product-suggestions";
  return (
    <Field id="productName" label={t("submit.productName")} error={error}>
      <div className="relative">
        <PackageSearch className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <Input
          id="productName"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          maxLength={120}
          className="pl-11 text-base"
          placeholder={t("submit.productNamePlaceholder")}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            query(e.target.value);
          }}
          onBlur={() => {
            onBlur();
            setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (!open || !suggestions.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              pick(suggestions[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {open && suggestions.length > 0 && (
          <ul id={listId} role="listbox" aria-label={t("submit.suggestions")} className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-[var(--shadow-lift)]">
            {suggestions.map((s, i) => (
              <li
                key={`${s.key}-${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-[15px] ${i === active ? "bg-brand-50" : "hover:bg-paper"}`}
              >
                <span className="font-medium">{locale === "bn" ? s.nameBn : s.nameEn}</span>
                <span className="text-xs text-muted">{locale === "bn" ? s.nameEn : s.nameBn}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}

function ImageField({ enabled, url, onChange }: { enabled: boolean; url: string; onChange: (img: { url: string; width: number; height: number } | null) => void }) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-semibold">{t("submit.image")}</p>
        <p className="rounded-xl bg-paper-deep px-3 py-2 text-sm text-muted">{t("submit.imagesDisabled")}</p>
      </div>
    );
  }

  async function upload(file: File) {
    setError(null);
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return setError(t("errors.imageType"));
    if (file.size > MAX_IMAGE_BYTES) return setError(t("errors.imageSize"));
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const json = (await res.json()) as { ok: boolean; data?: { url: string; width: number; height: number }; error?: string };
      if (!json.ok || !json.data) throw new Error(json.error ?? "errors.imageFailed");
      onChange(json.data);
    } catch (e) {
      setError(translateLoose(t, (e as Error).message, "errors.imageFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">
        {t("submit.image")} <span className="text-xs font-normal text-muted">({t("common.optional")})</span>
      </p>
      {url ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded preview */}
          <img src={url} alt="" className="size-20 rounded-xl object-cover" />
          <Button variant="outline" size="sm" onClick={() => onChange(null)}>
            <Trash2 /> {t("submit.imageRemove")}
          </Button>
        </div>
      ) : (
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-paper/60 px-4 py-5 text-center hover:border-brand-300">
          {uploading ? <Loader2 className="size-6 animate-spin text-brand-600" /> : <ImagePlus className="size-6 text-brand-600" aria-hidden />}
          <span className="text-sm font-semibold">{uploading ? t("submit.imageUploading") : t("submit.imageChoose")}</span>
          <span className="text-xs text-muted">{t("submit.imageHint")}</span>
          <input
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
