import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";
import { siteConfig } from "@/config/site";
import { getLocale } from "@/lib/i18n/server";
import { pages } from "@/messages/pages";

export async function generateMetadata(): Promise<Metadata> {
  const content = pages[await getLocale()].contact;
  return { title: content.title, description: content.intro, alternates: { canonical: "/contact" } };
}

export default async function ContactPage() {
  const locale = await getLocale();
  return (
    <StaticPage content={pages[locale].contact}>
      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-line bg-white p-5">
        <Mail className="size-6 text-brand-600" aria-hidden />
        {siteConfig.contactEmail ? (
          <a href={`mailto:${siteConfig.contactEmail}`} className="text-lg font-semibold text-brand-700 underline">
            {siteConfig.contactEmail}
          </a>
        ) : (
          // Placeholder until NEXT_PUBLIC_CONTACT_EMAIL is configured; no address is invented.
          <span className="text-muted">{locale === "bn" ? "যোগাযোগের ইমেইল এখনো কনফিগার করা হয়নি (NEXT_PUBLIC_CONTACT_EMAIL)।" : "Contact email not configured yet (NEXT_PUBLIC_CONTACT_EMAIL)."}</span>
        )}
      </div>
    </StaticPage>
  );
}
