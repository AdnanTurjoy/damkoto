import { Card } from "@/components/ui/card";
import { env, features } from "@/config/env";
import { siteConfig } from "@/config/site";
import { isAdmin } from "@/features/auth/permissions";
import { RoleSelect } from "@/features/moderation/components/role-select";
import { listProfiles } from "@/features/moderation/service";
import { staffPageGuard } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminSettingsPage() {
  const viewer = await staffPageGuard();
  const { t, locale } = await getI18n();
  const profiles = await listProfiles(await getDb());
  const on = (v: boolean) => (v ? t("admin.settings.enabled") : t("admin.settings.disabled"));
  const rows = [
    { label: t("admin.settings.database"), value: env.databaseUrl ? "PostgreSQL (DATABASE_URL)" : `PGlite (${env.pgliteDir})` },
    { label: t("admin.settings.moderation"), value: env.moderationMode === "pre" ? t("admin.settings.modePre") : t("admin.settings.modePost") },
    { label: t("admin.settings.images"), value: on(features.imageUploads) },
    { label: t("admin.settings.auth"), value: on(features.supabaseAuth) },
    { label: t("admin.settings.geocoder"), value: features.geocoding ? `Nominatim (${env.geocoder.nominatimUrl})` : t("admin.settings.disabled") },
    { label: t("admin.settings.tiles"), value: new URL(siteConfig.map.tileUrl.replace(/\{[a-z]\}/g, "a")).host },
    { label: t("admin.settings.demo"), value: on(env.showDemoData) },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t("admin.settings.title")}</h2>
      <Card className="p-5">
        <h3 className="font-bold">{t("admin.settings.services")}</h3>
        <dl className="mt-3 divide-y divide-line text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-wrap justify-between gap-2 py-2.5"><dt className="text-muted">{r.label}</dt><dd className="font-semibold">{r.value}</dd></div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted">{t("admin.settings.envHint")}</p>
      </Card>
      <Card className="p-5">
        <h3 className="font-bold">{t("admin.settings.roles")}</h3>
        <p className="text-sm text-muted">{t("admin.settings.rolesHint")}</p>
        <ul className="mt-3 divide-y divide-line text-sm">
          {profiles.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                <strong>{p.displayName ?? "—"}</strong> <code className="text-xs text-muted">{p.id}</code>
                <span className="block text-xs text-muted">{formatDate(locale, p.createdAt)}</span>
              </span>
              <RoleSelect userId={p.id} role={p.role} disabled={!isAdmin(viewer) || p.id === viewer.id} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
