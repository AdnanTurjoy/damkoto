"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { translateLoose } from "@/lib/i18n/core";
import { importOfficialPricesAction, setOfficialPriceActiveAction } from "../actions";
import { CSV_COLUMNS } from "../schema";
import { type OfficialFormValue } from "../form-value";
import { OfficialPriceForm } from "./official-price-form";

export function ActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant={isActive ? "outline" : "primary"}
      disabled={pending}
      className="h-8 px-2.5 text-xs"
      onClick={() =>
        startTransition(async () => {
          const r = await setOfficialPriceActiveAction(id, !isActive);
          if (!r.ok) return toast(translateLoose(t, r.error), "error");
          router.refresh();
        })
      }
    >
      {isActive ? t("admin.official.hide") : t("admin.official.restore")}
    </Button>
  );
}

export function EditOfficialPrice({ initial, products }: { initial: OfficialFormValue; products: { slug: string; nameBn: string; nameEn: string }[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {t("admin.official.edit")}
      </Button>
      {open && (
        <div className="mt-3 rounded-xl border border-line bg-paper/60 p-3">
          <OfficialPriceForm initial={initial} products={products} onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

export function CsvImport() {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [csv, setCsv] = useState(CSV_COLUMNS.join(",") + "\n");
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);
  const [pending, startTransition] = useTransition();

  function run() {
    setErrors([]);
    startTransition(async () => {
      const r = await importOfficialPricesAction(csv);
      if (!r.ok) return toast(translateLoose(t, r.error), "error");
      if (r.data.errors.length) {
        setErrors(r.data.errors);
        return toast(t("admin.official.importFailed"), "error");
      }
      toast(t("admin.official.imported", { count: r.data.saved }));
      setCsv(CSV_COLUMNS.join(",") + "\n");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t("admin.official.importHint")}</p>
      <code className="block overflow-x-auto rounded-lg bg-paper-deep px-3 py-2 text-xs">{CSV_COLUMNS.join(",")}</code>
      <label htmlFor="official-csv" className="sr-only">{t("admin.official.import")}</label>
      <Textarea id="official-csv" value={csv} onChange={(e) => setCsv(e.target.value)} rows={8} className="font-mono text-xs" spellCheck={false} />
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-700">
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) setCsv(await file.text());
            e.target.value = "";
          }}
        />
        {t("admin.official.chooseFile")}
      </label>
      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errors.slice(0, 20).map((e) => (
            <li key={`${e.line}-${e.message}`}>
              {e.line > 0 && <strong>{t("admin.official.line", { line: e.line })}: </strong>}
              {e.message.replace(/errors\.[a-zA-Z]+|official\.[a-zA-Z]+/g, (k) => translateLoose(t, k, "errors.invalidInput"))}
            </li>
          ))}
        </ul>
      )}
      <Button onClick={run} disabled={pending}>{t("admin.official.importButton")}</Button>
    </div>
  );
}
