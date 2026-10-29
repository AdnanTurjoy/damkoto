import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";
import { getLocale } from "@/lib/i18n/server";
import { pages } from "@/messages/pages";

export async function generateMetadata(): Promise<Metadata> {
  const content = pages[await getLocale()].guidelines;
  return { title: content.title, description: content.intro, alternates: { canonical: "/community-guidelines" } };
}

export default async function Page() {
  return <StaticPage content={pages[await getLocale()].guidelines} />;
}
