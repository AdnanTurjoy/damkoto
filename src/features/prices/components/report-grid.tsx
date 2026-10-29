import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/states";
import { buttonClasses } from "@/components/ui/button";
import type { Translate } from "@/lib/i18n/core";
import type { Paginated, ReportSummary } from "../queries";
import { PriceReportCard } from "./price-report-card";

export function ReportGrid({ data, t, hrefFor, columns = "sm:grid-cols-2 xl:grid-cols-3" }: { data: Paginated<ReportSummary>; t: Translate; hrefFor: (page: number) => string; columns?: string }) {
  if (!data.items.length) {
    return (
      <EmptyState
        title={t("prices.noResults")}
        text={t("prices.noResultsText")}
        action={
          <Link href="/submit" className={buttonClasses("accent")}>
            <PlusCircle /> {t("nav.submit")}
          </Link>
        }
      />
    );
  }
  return (
    <>
      <ul className={`grid gap-4 ${columns}`}>
        {data.items.map((report) => (
          <li key={report.id}>
            <PriceReportCard report={report} />
          </li>
        ))}
      </ul>
      <Pagination page={data.page} pageCount={data.pageCount} hrefFor={hrefFor} t={t} />
    </>
  );
}
