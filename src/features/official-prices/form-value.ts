import { dhakaToday } from "@/lib/utils";

/** Shared by the server admin page and the client form. */
export interface OfficialFormValue {
  id: string | null;
  category: string;
  source: string;
  itemBn: string;
  itemEn: string;
  productSlug: string;
  priceMin: string;
  priceMax: string;
  quantity: string;
  unit: string;
  unitLabel: string;
  area: string;
  effectiveDate: string;
  sourceUrl: string;
  note: string;
  isActive: boolean;
}

export const emptyOfficialForm = (): OfficialFormValue => ({
  id: null,
  category: "essentials",
  source: "TCB",
  itemBn: "",
  itemEn: "",
  productSlug: "",
  priceMin: "",
  priceMax: "",
  quantity: "1",
  unit: "kg",
  unitLabel: "",
  area: "",
  effectiveDate: dhakaToday(),
  sourceUrl: "",
  note: "",
  isActive: true,
});

