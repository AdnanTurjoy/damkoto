import { Card } from "@/components/ui/card";
import { isAdmin } from "@/features/auth/permissions";
import { getCategoryTree, type CategoryNode } from "@/features/categories/queries";
import { CategoryForm, type CategoryFormValue } from "@/features/moderation/components/category-form";
import { staffPageGuard } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { localName } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";

const toForm = (c: CategoryNode): CategoryFormValue => ({ id: c.id, slug: c.slug, nameBn: c.nameBn, nameEn: c.nameEn, parentId: c.parentId, icon: c.icon, sortOrder: c.sortOrder, isActive: c.isActive, suggestedUnits: c.suggestedUnits ?? [] });

export default async function AdminCategoriesPage() {
  const viewer = await staffPageGuard();
  const { t, locale } = await getI18n();
  const tree = await getCategoryTree(await getDb(), { includeInactive: true });
  const admin = isAdmin(viewer);
  const parents = tree.map((c) => ({ id: c.id, name: localName(locale, c) }));
  const blank: CategoryFormValue = { id: null, slug: "", nameBn: "", nameEn: "", parentId: null, icon: "package", sortOrder: 100, isActive: true, suggestedUnits: [] };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">{t("admin.categories.title")}</h2>
      {!admin && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{t("admin.categories.adminOnly")}</p>}
      <Card className="p-5">
        <h3 className="mb-3 font-bold">{t("admin.categories.create")}</h3>
        <CategoryForm value={blank} parents={parents} disabled={!admin} />
      </Card>
      {tree.map((c) => (
        <Card key={c.id} className="p-5">
          <CategoryForm value={toForm(c)} parents={parents} disabled={!admin} />
          {c.children.length > 0 && (
            <div className="mt-4 space-y-4 border-l-2 border-brand-100 pl-4">
              {c.children.map((child) => (
                <div key={child.id} className="border-t border-line pt-4">
                  <CategoryForm value={toForm(child)} parents={parents} disabled={!admin} />
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
