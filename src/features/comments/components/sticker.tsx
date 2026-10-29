"use client";

import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { getSticker, STICKERS, type StickerId } from "../stickers";

const TONES: Record<string, string> = {
  rose: "bg-rose-50 text-rose-800 border-rose-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  sky: "bg-sky-50 text-sky-800 border-sky-200",
  green: "bg-brand-50 text-brand-800 border-brand-200",
  violet: "bg-violet-50 text-violet-800 border-violet-200",
};

/** Original sticker: an emoji in a tilted speech-bubble badge with a Bengali caption. */
export function Sticker({ id, size = "md" }: { id: string; size?: "sm" | "md" }) {
  const { t } = useI18n();
  const sticker = getSticker(id);
  if (!sticker) return null;
  return (
    <span
      className={cn(
        "inline-flex -rotate-2 items-center gap-1.5 rounded-2xl rounded-bl-sm border-2 font-bold shadow-sm",
        TONES[sticker.tone],
        size === "md" ? "px-3 py-1.5 text-[15px]" : "px-2 py-0.5 text-[13px]",
      )}
    >
      <span aria-hidden className={size === "md" ? "text-xl" : "text-base"}>
        {sticker.emoji}
      </span>
      {t(`stickers.${sticker.id}`)}
    </span>
  );
}

export function StickerPicker({ value, onChange }: { value: StickerId | null; onChange: (id: StickerId | null) => void }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("comments.chooseSticker")} className="flex flex-wrap gap-2">
      {STICKERS.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={value === s.id}
          onClick={() => onChange(value === s.id ? null : s.id)}
          className={cn(
            "inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-[13px] font-semibold transition-transform hover:-translate-y-0.5",
            value === s.id ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white",
          )}
        >
          <span aria-hidden>{s.emoji}</span> {t(`stickers.${s.id}`)}
        </button>
      ))}
    </div>
  );
}
