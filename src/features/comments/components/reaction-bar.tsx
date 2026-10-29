"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber, translateLoose } from "@/lib/i18n/core";
import { cn } from "@/lib/utils";
import { toggleReactionAction } from "../actions";
import { STICKERS } from "../stickers";

type Reaction = { stickerId: string; count: number; mine: boolean };

export function ReactionBar({ reportId, initial }: { reportId: string; initial: Reaction[] }) {
  const { locale, t } = useI18n();
  const toast = useToast();
  const [reactions, setReactions] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle(stickerId: string) {
    startTransition(async () => {
      const result = await toggleReactionAction({ reportId, stickerId });
      if (result.ok) setReactions(result.data);
      else toast(translateLoose(t, result.error), "error");
    });
  }

  return (
    <div>
      <h2 className="text-base font-bold">{t("report.reactionsTitle")}</h2>
      <p className="text-sm text-muted">{t("report.reactionsHint")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {STICKERS.map((s) => {
          const r = reactions.find((x) => x.stickerId === s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={r?.mine ?? false}
              disabled={pending}
              onClick={() => toggle(s.id)}
              className={cn(
                "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors",
                r?.mine ? "border-amber-400 bg-amber-100" : "border-line bg-white hover:border-amber-300",
              )}
            >
              <span aria-hidden>{s.emoji}</span>
              {t(`stickers.${s.id}`)}
              {(r?.count ?? 0) > 0 && <span className="rounded-full bg-white/80 px-1.5 text-xs tabular-nums">{formatNumber(locale, r!.count)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
