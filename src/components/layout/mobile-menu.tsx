"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/client";
import { LanguageSwitcher } from "./language-switcher";

export function MobileMenu({ showAdmin }: { showAdmin: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/prices", label: t("nav.prices") },
    { href: "/map", label: t("nav.map") },
    { href: "/compare", label: t("nav.compare") },
    { href: "/official-prices", label: t("nav.official") },
    { href: "/submit", label: t("nav.submit") },
    { href: "/my-contributions", label: t("nav.myContributions") },
    { href: "/how-it-works", label: t("nav.howItWorks") },
    { href: "/about", label: t("nav.about") },
    ...(showAdmin ? [{ href: "/admin", label: t("nav.admin") }] : []),
  ];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("nav.menu")}
        aria-expanded={open}
        className="grid size-10 place-items-center rounded-xl border border-line bg-white lg:hidden"
      >
        <Menu className="size-5" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("nav.menu")} closeLabel={t("common.close")} variant="sheet">
        <nav aria-label={t("nav.menu")}>
          <ul className="divide-y divide-line">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center text-base font-semibold">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-5">
          <LanguageSwitcher />
        </div>
      </Dialog>
    </>
  );
}
