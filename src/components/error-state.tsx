"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export function ErrorState({ title, text, onRetry }: { title?: string; text?: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-red-100 text-red-700">
        <AlertTriangle className="size-7" />
      </div>
      <h2 className="mt-4 text-lg font-bold">{title ?? t("errors.pageTitle")}</h2>
      <p className="mt-1.5 max-w-md text-[15px] text-muted">{text ?? t("errors.server")}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RotateCw /> {t("common.retry")}
        </Button>
      )}
    </div>
  );
}
