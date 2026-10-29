import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { categories, priceReports, products } from "@/db/schema";
import type { Database } from "@/lib/db/client";
import { escapeLike, normalizeKey } from "@/lib/utils";

export interface CategoryNode {
  id: string;
  slug: string;
  nameBn: string;
  nameEn: string;
  icon: string;
  isActive: boolean;
  parentId: string | null;
  sortOrder: number;
  suggestedUnits: string[] | null;
  children: CategoryNode[];
}

export async function getCategoryTree(db: Database, options: { includeInactive?: boolean } = {}): Promise<CategoryNode[]> {
  const rows = await db
    .select()
    .from(categories)
    .where(options.includeInactive ? undefined : eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.nameEn));
  const nodes = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nameBn: r.nameBn,
    nameEn: r.nameEn,
    icon: r.icon,
    isActive: r.isActive,
    parentId: r.parentId,
    sortOrder: r.sortOrder,
    suggestedUnits: r.suggestedUnits,
    children: [] as CategoryNode[],
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots: CategoryNode[] = [];
  for (const node of nodes) {
    const parent = node.parentId ? byId.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else if (!node.parentId) roots.push(node);
  }
  return roots;
}

export async function getCategoryBySlug(db: Database, slug: string) {
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug));
  return row ?? null;
}

/** Matches a typed product name against the catalog (Bengali, English or alias). */
export async function resolveCatalogProduct(db: Database, name: string) {
  const key = normalizeKey(name);
  if (!key) return null;
  const [row] = await db
    .select()
    .from(products)
    .where(
      or(
        sql`lower(${products.nameBn}) = ${key}`,
        sql`lower(${products.nameEn}) = ${key}`,
        eq(products.slug, key),
        sql`${key} = any(${products.aliases})`,
      ),
    )
    .limit(1);
  return row ?? null;
}

export interface ProductSuggestion {
  key: string;
  nameBn: string;
  nameEn: string;
  categoryId: string | null;
  defaultUnit: string | null;
  reports: number;
}

/** Catalog matches first, then frequently reported custom product names. */
export async function suggestProducts(db: Database, q: string, limit = 8): Promise<ProductSuggestion[]> {
  const pattern = `%${escapeLike(q.trim())}%`;
  const keyPattern = `%${escapeLike(normalizeKey(q))}%`;
  const catalog = await db
    .select({
      key: products.slug,
      nameBn: products.nameBn,
      nameEn: products.nameEn,
      categoryId: products.categoryId,
      defaultUnit: products.defaultUnit,
    })
    .from(products)
    .where(
      or(
        ilike(products.nameBn, pattern),
        ilike(products.nameEn, pattern),
        sql`exists (select 1 from unnest(${products.aliases}) a where a like ${keyPattern})`,
      ),
    )
    .orderBy(asc(products.nameEn))
    .limit(limit);

  const custom = await db
    .select({
      key: priceReports.productKey,
      name: sql<string>`min(${priceReports.productName})`,
      categoryId: sql<string>`min(${priceReports.categoryId}::text)`,
      reports: sql<number>`count(*)::int`,
    })
    .from(priceReports)
    .where(and(eq(priceReports.status, "published"), sql`${priceReports.productId} is null`, ilike(priceReports.productName, pattern)))
    .groupBy(priceReports.productKey)
    .orderBy(sql`count(*) desc`)
    .limit(limit);

  return [
    ...catalog.map((c) => ({ ...c, reports: 0 })),
    ...custom.map((c) => ({ key: c.key, nameBn: c.name, nameEn: c.name, categoryId: c.categoryId, defaultUnit: null, reports: c.reports })),
  ].slice(0, limit);
}
