import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sticker } from "@/features/comments/components/sticker";
import { ModerationButtons } from "@/features/moderation/components/moderation-buttons";
import { listContentReports } from "@/features/moderation/service";
import { staffPageGuard } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formatDateTime, type MessageKey } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export default async function ContentReportsPage({ searchParams }: PageProps<"/admin/content-reports">) {
  await staffPageGuard();
  const { t, locale } = await getI18n();
  const raw = (await searchParams).status;
  const status = raw === "resolved" || raw === "dismissed" ? raw : "open";
  const flags = await listContentReports(await getDb(), status);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["open", "resolved", "dismissed"] as const).map((s) => (
          <Link key={s} href={`/admin/content-reports?status=${s}`} aria-current={s === status ? "page" : undefined} className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", s === status ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white")}>
            {t(`status.${s}`)}
          </Link>
        ))}
      </div>
      {flags.length === 0 ? (
        <Card className="p-6 text-muted">{t("admin.empty")}</Card>
      ) : (
        <ul className="space-y-3">
          {flags.map((f) => (
            <li key={f.id}>
              <Card className="grid gap-4 p-4 md:grid-cols-[1fr_15rem]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="red">{t(`flag.reasons.${f.reason}` as MessageKey)}</Badge>
                    <span className="text-xs text-muted">{f.targetType} · {formatDateTime(locale, f.createdAt)}</span>
                  </div>
                  {f.details && <p className="mt-2 text-sm">“{f.details}”</p>}
                  <div className="mt-3 rounded-xl bg-paper p-3 text-sm">
                    {f.report && (
                      <Link href={`/prices/${f.report.id}`} className="font-semibold text-brand-700 hover:underline">
                        {f.report.productName} — ৳{f.report.price} ({t(`status.${f.report.status}` as MessageKey)})
                      </Link>
                    )}
                    {f.comment && (
                      <div>
                        <Link href={`/prices/${f.comment.reportId}`} className="text-xs font-semibold text-brand-700 hover:underline">{t("admin.columns.target")}</Link>
                        {f.comment.body && <p className="mt-1 whitespace-pre-line break-words">{f.comment.body}</p>}
                        {f.comment.stickerId && <Sticker id={f.comment.stickerId} size="sm" />}
                        <p className="text-xs text-muted">{t(`status.${f.comment.status}` as MessageKey)}</p>
                      </div>
                    )}
                    {!f.report && !f.comment && <span className="text-muted">{t("errors.notFound")}</span>}
                  </div>
                </div>
                {f.status === "open" && <ModerationButtons kind="flag" id={f.id} actions={["resolve", "dismiss"]} />}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
