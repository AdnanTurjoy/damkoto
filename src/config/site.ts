/** Public, non-secret configuration safe for the browser. */
export const siteConfig = {
  name: "দাম কত?",
  nameEn: "Dam Koto?",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Placeholder until a real address is supplied via NEXT_PUBLIC_CONTACT_EMAIL. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  map: {
    tileUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ??
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: Number(process.env.NEXT_PUBLIC_MAP_MAX_ZOOM ?? 19),
    /** Bangladesh bounding box [south, west, north, east]. */
    bounds: [20.5, 88.0, 26.7, 92.7] as const,
    center: [23.7, 90.35] as const,
  },
  /** Reports older than this many days are marked as possibly outdated. */
  staleAfterDays: 14,
  pageSize: 20,
};
