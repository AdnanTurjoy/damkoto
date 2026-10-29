import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container, EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { isStaff } from "@/features/auth/permissions";
import { signOutAction } from "@/features/auth/actions";
import { AdminNav } from "@/features/moderation/components/admin-nav";
import { getViewer } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Gate for the admin UI. Note: this is a convenience — every moderation
 * action independently re-checks the role on the server.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/admin");
  if (!isStaff(viewer)) {
    return (
      <Container className="max-w-xl py-16">
        <EmptyState title={t("admin.forbiddenTitle")} text={t("admin.forbiddenText")} />
      </Container>
    );
  }
  return (
    <Container className="py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("admin.title")}</h1>
        <form action={signOutAction} className="flex items-center gap-3 text-sm text-muted">
          <span>{t("auth.signedInAs", { name: viewer.displayName ?? viewer.id.slice(0, 8) })} · {t(`admin.settings.roleNames.${viewer.role}`)}</span>
          <Button type="submit" size="sm" variant="outline">{t("nav.logout")}</Button>
        </form>
      </div>
      <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
      <p className="sr-only"><Link href="/">{t("nav.home")}</Link></p>
    </Container>
  );
}
