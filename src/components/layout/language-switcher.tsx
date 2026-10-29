"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { setLocaleAction } from "@/features/auth/actions";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/core";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "damkoto.lang";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Restore a saved preference if the cookie was cleared but localStorage kept it.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const hasCookie = document.cookie.split("; ").some((c) => c.startsWith(`${LOCALE_COOKIE}=`));
    if ((saved === "bn" || saved === "en") && !hasCookie && saved !== locale) {
      startTransition(async () => {
        await setLocaleAction(saved);
        router.refresh();
      });
    }
  }, [locale, router]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function choose(next: Locale) {
    if (next === locale) return;
    window.localStorage.setItem(STORAGE_KEY, next);
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div role="group" aria-label={t("common.language")} className={cn("inline-flex items-center rounded-xl border border-line bg-white p-0.5", pending && "opacity-60", className)}>
      <Languages className="mx-1.5 size-4 text-muted" aria-hidden />
      {(["bn", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={locale === l}
          lang={l}
          className={cn(
            "h-8 cursor-pointer rounded-lg px-2.5 text-sm font-semibold transition-colors",
            locale === l ? "bg-brand-600 text-white" : "text-muted hover:text-ink",
          )}
        >
          {l === "bn" ? t("common.bengali") : t("common.english")}
        </button>
      ))}
    </div>
  );
}
