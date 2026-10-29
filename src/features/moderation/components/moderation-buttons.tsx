"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { translateLoose } from "@/lib/i18n/core";
import type { ActionResult } from "@/lib/errors";
import { moderateCommentAction, moderateReportAction, resolveFlagAction } from "../actions";
import type { CommentAction, ReportAction } from "../service";

type Kind =
  | { kind: "report"; id: string; actions: ReportAction[] }
  | { kind: "comment"; id: string; actions: CommentAction[] }
  | { kind: "flag"; id: string; actions: ("resolve" | "dismiss")[] };

/** Moderation buttons with an optional note; the server re-checks the role on every call. */
export function ModerationButtons(props: Kind) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function run(action: string) {
    startTransition(async () => {
      let result: ActionResult;
      if (props.kind === "report") result = await moderateReportAction(props.id, action as ReportAction, note);
      else if (props.kind === "comment") result = await moderateCommentAction(props.id, action as CommentAction, note);
      else result = await resolveFlagAction(props.id, action as "resolve" | "dismiss", note);
      if (!result.ok) return toast(translateLoose(t, result.error), "error");
      toast(t("admin.done"));
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t("admin.note")} aria-label={t("admin.note")} className="h-8 rounded-lg border border-line px-2 text-xs" />
      <div className="flex flex-wrap gap-1">
        {props.actions.map((a) => (
          <Button key={a} size="sm" variant={a === "approve" || a === "restore" ? "primary" : a === "dismiss" || a === "clearFlags" ? "outline" : "danger"} disabled={pending} onClick={() => run(a)} className="h-8 px-2.5 text-xs">
            {t(`admin.actions.${a}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
