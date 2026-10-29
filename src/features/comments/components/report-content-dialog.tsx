"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { translateLoose } from "@/lib/i18n/core";
import { FLAG_REASONS } from "@/schemas/community";
import { flagContentAction } from "../actions";

export function ReportContentDialog({ open, onClose, targetType, targetId }: { open: boolean; onClose: () => void; targetType: "report" | "comment"; targetId: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [reason, setReason] = useState<(typeof FLAG_REASONS)[number]>("wrong_price");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await flagContentAction({ targetType, targetId, reason, details });
      if (!result.ok && result.error !== "errors.alreadyReported") return setError(translateLoose(t, result.error));
      toast(result.ok ? t("flag.thanks") : t("errors.alreadyReported"));
      setDetails("");
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title={t("flag.title")} description={t("flag.description")} closeLabel={t("common.close")}>
      <form onSubmit={submit} className="space-y-4">
        <Field id={`flag-reason-${targetId}`} label={t("flag.reason")}>
          <Select id={`flag-reason-${targetId}`} value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
            {FLAG_REASONS.map((r) => (
              <option key={r} value={r}>
                {t(`flag.reasons.${r}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`flag-details-${targetId}`} label={t("flag.details")}>
          <Textarea id={`flag-details-${targetId}`} maxLength={500} rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
        </Field>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {t("flag.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
