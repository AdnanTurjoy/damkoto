import Link from "next/link";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/config/site";
import { getI18n } from "@/lib/i18n/server";
import { LanguageSwitcher } from "./language-switcher";

export async function SiteFooter() {
  const { t } = await getI18n();
  const explore = [
    { href: "/prices", label: t("nav.prices") },
    { href: "/map", label: t("nav.map") },
    { href: "/compare", label: t("nav.compare") },
    { href: "/submit", label: t("nav.submit") },
  ];
  const platform = [
    { href: "/about", label: t("footer.about") },
    { href: "/how-it-works", label: t("footer.howItWorks") },
    { href: "/community-guidelines", label: t("footer.guidelines") },
    { href: "/privacy", label: t("footer.privacy") },
    { href: "/terms", label: t("footer.terms") },
    { href: "/contact", label: t("footer.reportProblem") },
  ];
  return (
    <footer className="mt-20 border-t border-line bg-white pb-24 lg:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo name={t("common.appName")} />
          <p className="mt-3 text-[15px] text-muted">{t("footer.blurb")}</p>
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{t("footer.notAShop")}</p>
          <LanguageSwitcher className="mt-5" />
        </div>
        <FooterColumn title={t("footer.explore")} links={explore} />
        <FooterColumn title={t("footer.platform")} links={platform} />
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-xs text-muted sm:flex-row sm:justify-between sm:px-6">
          <span>
            © {new Date().getFullYear()} {t("common.appName")} · {t("footer.contact")}:{" "}
            {siteConfig.contactEmail ? <a className="underline" href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a> : <Link className="underline" href="/contact">{t("footer.reportProblem")}</Link>}
          </span>
          <span>
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
              {t("footer.mapData")}
            </a>{" "}
            · {t("footer.locationData")}
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-[15px] text-muted hover:text-brand-700">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
