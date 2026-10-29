import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Sticker } from "@/features/comments/components/sticker";
import { ModerationButtons } from "@/features/moderation/components/moderation-buttons";
import { listAdminComments } from "@/features/moderation/service";
import { staffPageGuard } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formatDateTime, type MessageKey } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminCommentsPage({ searchParams }: PageProps<"/admin/comments">) {
  await staffPageGuard();
  const { t, locale } = await getI18n();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const params = { status: str("status"), flagged: str("flagged") === "1", page: Math.max(1, Number(str("page")) || 1) };
  const data = await listAdminComments(await getDb(), params);
  const href = (page: number) => `/admin/comments?${new URLSearchParams({ ...(params.status ? { status: params.status } : {}), ...(params.flagged ? { flagged: "1" } : {}), page: String(page) })}`;

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-center gap-2">
        <Select name="status" defaultValue={params.status ?? ""} className="h-10 w-48" aria-label={t("admin.filterStatus")}>
          <option value="">{t("admin.all")}</option>
          {["published", "hidden", "removed"].map((s) => <option key={s} value={s}>{t(`status.${s}` as MessageKey)}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="flagged" value="1" defaultChecked={params.flagged} className="accent-brand-600" /> {t("admin.flaggedOnly")}</label>
        <Button type="submit" size="sm" className="h-10">{t("common.search")}</Button>
      </form>
      {data.rows.length === 0 ? (
        <Card className="p-6 text-muted">{t("admin.empty")}</Card>
      ) : (
        <ul className="space-y-3">
          {data.rows.map((c) => (
            <li key={c.id}>
              <Card className="grid gap-4 p-4 md:grid-cols-[1fr_15rem]">
                <div className="min-w-0">
                  <p className="text-xs text-muted">
                    <Link href={`/prices/${c.reportId}`} className="font-semibold text-brand-700 hover:underline">{c.productName}</Link> · {c.displayName ?? t("common.anonymous")} · {formatDateTime(locale, c.createdAt)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge tone={c.status === "published" ? "brand" : "red"}>{t(`status.${c.status}` as MessageKey)}</Badge>
                    {c.deletedAt && <Badge>{t("comments.deleted")}</Badge>}
                    {c.openFlags > 0 && <Badge tone="red">{t("admin.columns.reports")}: {c.openFlags}</Badge>}
                    {c.sameAuthor > 2 && <Badge tone="amber">{t("admin.sameAuthor", { count: c.sameAuthor })}</Badge>}
                  </div>
                  {c.body && <p className="mt-2 whitespace-pre-line break-words">{c.body}</p>}
                  {c.stickerId && <div className="mt-2"><Sticker id={c.stickerId} size="sm" /></div>}
                </div>
                <ModerationButtons kind="comment" id={c.id} actions={c.status === "published" ? ["hide", "remove"] : ["restore"]} />
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={params.page} pageCount={data.pageCount} hrefFor={href} t={t} />
    </div>
  );
}
