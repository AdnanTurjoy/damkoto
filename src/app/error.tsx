"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/error-state";
import { useI18n } from "@/lib/i18n/client";

/** Page-level boundary: the header, footer and navigation keep working. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <ErrorState title={t("errors.pageTitle")} text={t("errors.pageText")} onRetry={reset} />
    </div>
  );
}
