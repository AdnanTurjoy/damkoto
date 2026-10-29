import { AlertTriangle, Clock, FileCheck2, Flag, MessageSquare, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getDashboardStats } from "@/features/moderation/service";
import { staffPageGuard } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formatDateTime, formatNumber, localName } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminDashboard() {
  await staffPageGuard();
  const { t, locale } = await getI18n();
  const s = await getDashboardStats(await getDb());
  const tiles = [
    { label: t("admin.stats.published"), value: s.published, icon: FileCheck2 },
    { label: t("admin.stats.recent"), value: s.recent, icon: Upload },
    { label: t("admin.stats.pending"), value: s.pending, icon: Clock },
    { label: t("admin.stats.flagged"), value: s.flagged, icon: AlertTriangle },
    { label: t("admin.stats.comments"), value: s.commentCount, icon: MessageSquare },
    { label: t("admin.stats.openReports"), value: s.openFlags, icon: Flag },
  ];
  const maxCat = Math.max(1, ...s.byCategory.map((c) => c.count));
  const maxDiv = Math.max(1, ...s.byDivision.map((c) => c.count));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <Icon className="size-5 text-brand-600" aria-hidden />
            <p className="mt-2 text-3xl font-bold tabular-nums">{formatNumber(locale, value)}</p>
            <p className="text-sm text-muted">{label}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[{ title: t("admin.byCategory"), rows: s.byCategory, max: maxCat }, { title: t("admin.byDivision"), rows: s.byDivision, max: maxDiv }].map((block) => (
          <Card key={block.title} className="p-5">
            <h2 className="font-bold">{block.title}</h2>
            {block.rows.length ? (
              <ul className="mt-3 space-y-2">
                {block.rows.map((r) => (
                  <li key={r.nameEn} className="text-sm">
                    <div className="flex justify-between"><span>{localName(locale, r)}</span><span className="tabular-nums text-muted">{formatNumber(locale, r.count)}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-paper-deep"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(r.count / block.max) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">{t("admin.empty")}</p>
            )}
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <h2 className="font-bold">{t("admin.activity")}</h2>
        {s.activity.length ? (
          <ul className="mt-3 divide-y divide-line text-sm">
            {s.activity.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span><strong>{a.action}</strong> · {a.targetType} <code className="text-xs text-muted">{a.targetId.slice(0, 8)}</code>{a.note && <> — {a.note}</>}</span>
                <span className="text-muted">{a.actorName ?? "—"} · {formatDateTime(locale, a.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">{t("admin.noActivity")}</p>
        )}
      </Card>
    </div>
  );
}
