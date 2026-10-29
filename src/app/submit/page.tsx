import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/states";
import { features } from "@/config/env";
import { getCategoryTree } from "@/features/categories/queries";
import { getDivisionsAndDistricts } from "@/features/locations/queries";
import { PriceReportForm } from "@/features/prices/components/price-report-form";
import { getDb } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("submit.title"), description: t("submit.metaDescription"), alternates: { canonical: "/submit" } };
}

export default async function SubmitPage() {
  const { t } = await getI18n();
  const db = await getDb();
  const [categories, { divisions, districts }] = await Promise.all([getCategoryTree(db), getDivisionsAndDistricts(db)]);
  return (
    <Container className="max-w-3xl">
      <PageHeader title={t("submit.title")} subtitle={t("submit.subtitle")} />
      <PriceReportForm categories={categories} divisions={divisions} districts={districts} imageUploads={features.imageUploads} />
    </Container>
  );
}
