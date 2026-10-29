import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { ModerationButtons } from "@/features/moderation/components/moderation-buttons";
import { listAdminReports, type ReportAction } from "@/features/moderation/service";
import { formatQuantity } from "@/features/prices/format";
import { staffPageGuard } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formatDateTime, formatTaka, localName, type MessageKey } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";

const ACTIONS: Record<string, ReportAction[]> = {
  pending: ["approve", "reject", "hide"],
  published: ["hide", "clearFlags"],
  hidden: ["restore"],
  rejected: ["restore"],
};

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await staffPageGuard();
  const { t, locale } = await getI18n();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const params = { status: str("status"), flagged: str("flagged") === "1", q: str("q")?.slice(0, 80), page: Math.max(1, Number(str("page")) || 1) };
  const data = await listAdminReports(await getDb(), params);
  const href = (page: number) => `/admin/reports?${new URLSearchParams({ ...(params.status ? { status: params.status } : {}), ...(params.flagged ? { flagged: "1" } : {}), ...(params.q ? { q: params.q } : {}), page: String(page) })}`;

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={params.q} placeholder={t("admin.searchPlaceholder")} className="h-10 w-64" aria-label={t("admin.searchPlaceholder")} />
        <Select name="status" defaultValue={params.status ?? ""} className="h-10 w-48" aria-label={t("admin.filterStatus")}>
          <option value="">{t("admin.all")}</option>
          {["pending", "published", "hidden", "rejected"].map((s) => <option key={s} value={s}>{t(`status.${s}` as MessageKey)}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="flagged" value="1" defaultChecked={params.flagged} className="accent-brand-600" /> {t("admin.flaggedOnly")}</label>
        <Button type="submit" size="sm" className="h-10">{t("common.search")}</Button>
      </form>
      {data.rows.length === 0 ? (
        <Card className="p-6 text-muted">{t("admin.empty")}</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="bg-paper text-left text-xs uppercase text-muted">
              <tr>
                {(["item", "price", "location", "status", "flags", "date", "actions"] as const).map((c) => <th key={c} scope="col" className="px-3 py-2.5 font-semibold">{t(`admin.columns.${c}`)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="max-w-56 px-3 py-3">
                    <Link href={`/prices/${r.id}`} className="font-semibold text-brand-700 hover:underline">{r.productName}</Link>
                    {r.isDemo && <Badge tone="sky" className="ml-1">{t("common.demo")}</Badge>}
                    <p className="text-xs text-muted">{r.displayName ?? t("common.anonymous")}</p>
                    {r.note && <p className="mt-1 line-clamp-2 text-xs text-muted">{r.note}</p>}
                  </td>
                  <td className="px-3 py-3 tabular-nums">{formatTaka(locale, r.price)} / {formatQuantity(locale, t, r.quantity, r.unit)}</td>
                  <td className="px-3 py-3">{localName(locale, { nameBn: r.districtBn, nameEn: r.districtEn })}</td>
                  <td className="px-3 py-3"><Badge tone={r.status === "published" ? "brand" : r.status === "pending" ? "amber" : "red"}>{t(`status.${r.status}` as MessageKey)}</Badge></td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.flags.map((f) => <Badge key={f} tone="amber">{t(`flags.${f}` as MessageKey)}</Badge>)}
                      {r.openFlags > 0 && <Badge tone="red">{t("admin.columns.reports")}: {r.openFlags}</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">{formatDateTime(locale, r.createdAt)}</td>
                  <td className="w-60 px-3 py-3"><ModerationButtons kind="report" id={r.id} actions={ACTIONS[r.status] ?? []} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Pagination page={params.page} pageCount={data.pageCount} hrefFor={href} t={t} />
    </div>
  );
}
