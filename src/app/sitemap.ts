import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getCategoryTree } from "@/features/categories/queries";
import { getSitemapReports } from "@/features/prices/queries";
import { getDb } from "@/lib/db";

// Regenerate hourly at runtime rather than freezing the build-time result.
export const revalidate = 3600;

/** Only published, non-demo reports are listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const statics = ["", "/prices", "/map", "/compare", "/official-prices", "/submit", "/about", "/how-it-works", "/community-guidelines", "/privacy", "/terms", "/contact"].map((p) => ({ url: `${base}${p}` }));
  try {
    const db = await getDb();
    const [reports, categories] = await Promise.all([getSitemapReports(db), getCategoryTree(db)]);
    return [
      ...statics,
      ...categories.flatMap((c) => [c, ...c.children]).map((c) => ({ url: `${base}/categories/${c.slug}` })),
      ...reports.map((r) => ({ url: `${base}/prices/${r.id}`, lastModified: r.updatedAt })),
    ];
  } catch {
    return statics;
  }
}
