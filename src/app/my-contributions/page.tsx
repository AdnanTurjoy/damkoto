import { MessageCircle, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container, EmptyState, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sticker } from "@/features/comments/components/sticker";
import { PriceReportCard } from "@/features/prices/components/price-report-card";
import { getMyContributions } from "@/features/prices/mine";
import { getDb } from "@/lib/db";
import { formatDateTime, formatNumber, type MessageKey } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";
import { getActor } from "@/lib/server-context";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("mine.title"), robots: { index: false } };
}

export default async function MyContributionsPage() {
  const { t, locale } = await getI18n();
  const data = await getMyContributions(await getDb(), await getActor());
  const stats = [
    { label: t("mine.statReports"), value: data.reports.length },
    { label: t("mine.statComments"), value: data.comments.length },
    { label: t("mine.statDistricts"), value: data.districts },
  ];

  return (
    <Container>
      <PageHeader title={t("mine.title")} subtitle={t("mine.subtitle")} />
      <p className="mb-6 rounded-xl bg-paper-deep px-4 py-3 text-sm text-muted">{t("mine.guestNote")}</p>
      <dl className="mb-10 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <dd className="text-3xl font-bold tabular-nums text-brand-700">{formatNumber(locale, s.value)}</dd>
            <dt className="text-sm text-muted">{s.label}</dt>
          </Card>
        ))}
      </dl>

      <h2 className="mb-4 text-xl font-bold">{t("mine.reports")}</h2>
      {data.reports.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.reports.map((r) => (
            <li key={r.id} className="space-y-1.5">
              {r.status !== "published" && <Badge tone={r.status === "pending" ? "amber" : "red"}>{t(`status.${r.status}` as MessageKey)}</Badge>}
              <PriceReportCard report={r} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t("mine.empty")} action={<Link href="/submit" className={buttonClasses("accent")}><Plus /> {t("nav.submit")}</Link>} />
      )}

      <h2 className="mb-4 mt-12 text-xl font-bold">{t("mine.comments")}</h2>
      {data.comments.length ? (
        <ul className="space-y-3">
          {data.comments.map((c) => (
            <li key={c.id}>
              <Card className="p-4">
                <p className="text-sm text-muted">
                  {t("mine.onReport")}:{" "}
                  <Link href={`/prices/${c.reportId}`} className="font-semibold text-brand-700 hover:underline">
                    {c.productName}
                  </Link>{" "}
                  · {formatDateTime(locale, c.createdAt)}
                  {c.status !== "published" && <> · {t(`status.${c.status}` as MessageKey)}</>}
                </p>
                {c.body && <p className="mt-1.5 whitespace-pre-line break-words">{c.body}</p>}
                {c.stickerId && <div className="mt-2"><Sticker id={c.stickerId} size="sm" /></div>}
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<MessageCircle />} title={t("mine.empty")} />
      )}
    </Container>
  );
}
