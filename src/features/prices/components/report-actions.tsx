"use client";

import { Flag, Pencil, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { translateLoose } from "@/lib/i18n/core";
import { ReportContentDialog } from "@/features/comments/components/report-content-dialog";
import { deletePriceReportAction } from "../actions";

export function ShareButton({ title }: { title: string }) {
  const { t } = useI18n();
  const toast = useToast();
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      toast(t("common.copied"));
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={share}>
      <Share2 /> {t("common.share")}
    </Button>
  );
}

export function FlagReportButton({ reportId }: { reportId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Flag /> {t("report.reportAbuse")}
      </Button>
      <ReportContentDialog open={open} onClose={() => setOpen(false)} targetType="report" targetId={reportId} />
    </>
  );
}

export function OwnerActions({ reportId }: { reportId: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function remove() {
    if (!window.confirm(t("report.deleteConfirm"))) return;
    startTransition(async () => {
      const result = await deletePriceReportAction(reportId);
      if (!result.ok) return toast(translateLoose(t, result.error), "error");
      toast(t("report.deleted"));
      router.push("/my-contributions");
    });
  }
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
      <p className="font-semibold">{t("report.manage")}</p>
      <p className="text-sm text-muted">{t("report.manageHint")}</p>
      <div className="mt-3 flex gap-2">
        <Link href={`/prices/${reportId}/edit`} className={buttonClasses("outline", "sm")}>
          <Pencil /> {t("common.edit")}
        </Link>
        <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
          <Trash2 /> {t("common.delete")}
        </Button>
      </div>
    </div>
  );
}
