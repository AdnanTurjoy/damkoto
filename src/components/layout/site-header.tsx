import { Plus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { isStaff } from "@/features/auth/permissions";
import { getViewer } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";
import { DesktopNav } from "./nav-links";

export async function SiteHeader() {
  const { t } = await getI18n();
  const viewer = await getViewer().catch(() => null);
  const staff = isStaff(viewer);
  return (
    <header className="sticky top-0 z-[900] border-b border-line/80 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded-lg" aria-label={t("nav.home")}>
          <Logo name={t("common.appName")} />
        </Link>
        <DesktopNav />
        <div className="ml-auto flex items-center gap-2">
          {staff && (
            <Link href="/admin" className="hidden text-sm font-semibold text-brand-700 hover:underline lg:inline">
              {t("nav.admin")}
            </Link>
          )}
          <Link href="/my-contributions" className="hidden px-2 text-sm font-semibold text-muted hover:text-ink xl:inline">
            {t("nav.myContributions")}
          </Link>
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <Link href="/submit" className={buttonClasses("accent", "md", "hidden lg:inline-flex")}>
            <Plus /> {t("nav.submit")}
          </Link>
          <MobileMenu showAdmin={staff} />
        </div>
      </div>
    </header>
  );
}
