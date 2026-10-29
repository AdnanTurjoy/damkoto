import type { Metadata, Viewport } from "next";
import { Hind_Siliguri } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MobileTabBar } from "@/components/layout/nav-links";
import { ToastProvider } from "@/components/ui/toast";
import { siteConfig } from "@/config/site";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const bengali = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  const title = `${t("common.appName")} — ${t("common.tagline")}`;
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: title, template: `%s · ${t("common.appName")}` },
    description: t("meta.defaultDescription"),
    applicationName: siteConfig.name,
    openGraph: {
      type: "website",
      siteName: t("common.appName"),
      title,
      description: t("meta.defaultDescription"),
      locale: locale === "bn" ? "bn_BD" : "en_US",
    },
    twitter: { card: "summary", title, description: t("meta.defaultDescription") },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  themeColor: "#136c48",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, t } = await getI18n();
  return (
    <html lang={locale} className={bengali.variable}>
      <body className="min-h-dvh antialiased">
        <I18nProvider locale={locale}>
          <ToastProvider>
            <a href="#main" className="sr-only z-[1000] rounded-lg bg-brand-700 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
              {t("common.skipToContent")}
            </a>
            <SiteHeader />
            <main id="main" className="min-h-[60vh]">
              {children}
            </main>
            <SiteFooter />
            <MobileTabBar />
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
