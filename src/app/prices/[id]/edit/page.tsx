import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/states";
import { features } from "@/config/env";
import { canModifyReport } from "@/features/auth/permissions";
import { getCategoryTree } from "@/features/categories/queries";
import { getDivisionsAndDistricts } from "@/features/locations/queries";
import { PriceReportForm, type PriceFormState } from "@/features/prices/components/price-report-form";
import { getReportDetail } from "@/features/prices/queries";
import { getDb } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { getActor } from "@/lib/server-context";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("report.editTitle"), robots: { index: false } };
}

export default async function EditReportPage({ params }: PageProps<"/prices/[id]/edit">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { t } = await getI18n();
  const db = await getDb();
  const [report, actor] = await Promise.all([getReportDetail(db, id), getActor()]);
  if (!report) notFound();
  const owned = { ownerHash: report.submitterHash, ownerId: report.contributorId, createdAt: report.createdAt, status: report.status };
  if (!canModifyReport(owned, actor)) notFound();

  const [categories, { divisions, districts }] = await Promise.all([getCategoryTree(db), getDivisionsAndDistricts(db)]);
  const initial: PriceFormState = {
    productName: report.productName,
    categoryId: report.categoryId,
    price: String(report.price),
    quantity: String(report.quantity),
    unit: report.unit,
    packageDescription: report.packageDescription ?? "",
    brand: report.brand ?? "",
    variant: report.variant ?? "",
    marketName: report.marketName ?? "",
    condition: report.condition ?? "",
    note: report.note ?? "",
    displayName: report.displayName ?? "",
    purchaseDate: report.purchaseDate ?? "",
    imageUrl: report.imageUrl ?? "",
    imageWidth: report.imageWidth ?? undefined,
    imageHeight: report.imageHeight ?? undefined,
    location: {
      divisionId: String(report.divisionId),
      districtId: String(report.districtId),
      upazilaId: report.upazilaId ? String(report.upazilaId) : "",
      locality: report.locality ?? "",
      ...(report.locationMethod !== "admin" && report.lat != null && report.lng != null ? { lat: report.lat, lng: report.lng } : {}),
      method: report.locationMethod,
    },
  };

  return (
    <Container className="max-w-3xl">
      <PageHeader title={t("report.editTitle")} subtitle={t("report.manageHint")} />
      <PriceReportForm categories={categories} divisions={divisions} districts={districts} imageUploads={features.imageUploads} initial={initial} reportId={report.id} />
    </Container>
  );
}
