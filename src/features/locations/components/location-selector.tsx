"use client";

import { Crosshair, List, LocateFixed, MapPinned, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/config/site";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/i18n/core";
import { cn } from "@/lib/utils";
import type { LocationOption } from "../queries";
import { useUpazilas } from "./use-upazilas";

const LocationPickerMap = dynamic(() => import("@/features/map/components/location-picker-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full" />,
});

export interface LocationValue {
  divisionId: string;
  districtId: string;
  upazilaId: string;
  locality: string;
  lat?: number;
  lng?: number;
  method: "admin" | "map" | "gps";
}

interface Props {
  idPrefix: string;
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  divisions: LocationOption[];
  districts: LocationOption[];
  errors?: { districtId?: string; divisionId?: string; upazilaId?: string; locality?: string; lat?: string };
  /** Comments use a compact variant without map/GPS. */
  compact?: boolean;
}

const [south, west, north, east] = siteConfig.map.bounds;

/**
 * Three ways to set a location: administrative lists, a map point, or the
 * device's current position (only after the user asks). The district select
 * is always visible and authoritative; map/GPS only prefill it.
 */
export function LocationSelector({ idPrefix, value, onChange, divisions, districts, errors, compact }: Props) {
  const { locale, t } = useI18n();
  const [tab, setTab] = useState<"admin" | "map" | "gps">(value.method);
  const [status, setStatus] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const upazilas = useUpazilas(value.districtId ? Number(value.districtId) : null);
  const visibleDistricts = value.divisionId ? districts.filter((d) => String(d.parentId) === value.divisionId) : districts;
  const district = districts.find((d) => String(d.id) === value.districtId);
  const errorText = (key?: string) => (key ? t(key as Parameters<typeof t>[0]) : null);

  const applyPoint = useCallback(
    async (lat: number, lng: number, method: "map" | "gps") => {
      if (lat < south || lat > north || lng < west || lng > east) {
        setStatus({ tone: "error", text: t("location.outsideBd") });
        return;
      }
      onChange({ ...value, lat, lng, method });
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
        const json = (await res.json()) as { ok: boolean; data?: { districtId: number | null; divisionId: number | null; locality: string | null } };
        if (json.ok && json.data?.districtId) {
          const changed = String(json.data.districtId) !== value.districtId;
          onChange({
            ...value,
            lat,
            lng,
            method,
            divisionId: String(json.data.divisionId ?? ""),
            districtId: String(json.data.districtId),
            upazilaId: changed ? "" : value.upazilaId,
            locality: value.locality || json.data.locality || "",
          });
          setStatus({ tone: "info", text: json.data.locality ? `${t("location.nearestDistrict")} ${t("location.suggestedLocality", { name: json.data.locality })}` : t("location.nearestDistrict") });
        }
      } catch {
        // Offline lookup failed; the user can still pick the district manually.
      }
    },
    [onChange, t, value],
  );

  function locateMe() {
    if (!("geolocation" in navigator)) return setStatus({ tone: "error", text: t("location.gpsUnavailable") });
    setStatus({ tone: "info", text: t("location.locating") });
    navigator.geolocation.getCurrentPosition(
      (pos) => applyPoint(pos.coords.latitude, pos.coords.longitude, "gps"),
      (err) => setStatus({ tone: "error", text: err.code === err.PERMISSION_DENIED ? t("location.gpsDenied") : t("location.gpsUnavailable") }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  const hasPoint = value.lat !== undefined && value.lng !== undefined;
  const tabs = [
    { id: "admin" as const, label: t("location.methodAdmin"), icon: List },
    { id: "map" as const, label: t("location.methodMap"), icon: MapPinned },
    { id: "gps" as const, label: t("location.methodGps"), icon: Crosshair },
  ];

  return (
    <div className="space-y-4">
      {!compact && (
        <>
          <div role="tablist" aria-label={t("location.methodsLabel")} className="grid grid-cols-3 gap-1 rounded-xl bg-paper-deep p-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold sm:text-sm",
                  tab === id ? "bg-white text-brand-800 shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden /> <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {tab === "gps" && (
            <div className="rounded-xl border border-line bg-brand-50/50 p-4">
              <p className="text-sm text-muted">{t("location.gpsExplain")}</p>
              <Button className="mt-3" variant="outline" onClick={locateMe}>
                <LocateFixed /> {t("location.useMyLocation")}
              </Button>
            </div>
          )}
          {(tab === "map" || (tab === "gps" && hasPoint)) && (
            <div>
              <p className="mb-2 text-sm text-muted">{t("location.mapHint")}</p>
              <LocationPickerMap
                point={hasPoint ? { lat: value.lat!, lng: value.lng! } : null}
                onPick={(lat, lng) => applyPoint(lat, lng, tab === "gps" ? "gps" : "map")}
                center={district?.lat != null && district.lng != null ? [district.lat, district.lng] : undefined}
              />
            </div>
          )}
          {status && (
            <p role="status" className={cn("text-sm", status.tone === "error" ? "font-medium text-red-700" : "text-brand-800")}>
              {status.text}
            </p>
          )}
          {hasPoint && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm">
              <span>
                {t("location.pointSelected")} · {value.lat!.toFixed(3)}, {value.lng!.toFixed(3)}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 font-semibold text-brand-700"
                onClick={() => onChange({ ...value, lat: undefined, lng: undefined, method: "admin" })}
              >
                <X className="size-4" /> {t("location.clearPoint")}
              </button>
            </div>
          )}
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${idPrefix}-division`} label={t("filters.division")} error={errorText(errors?.divisionId)}>
          <Select
            id={`${idPrefix}-division`}
            value={value.divisionId}
            onChange={(e) => onChange({ ...value, divisionId: e.target.value, districtId: "", upazilaId: "" })}
          >
            <option value="">{t("location.chooseDivision")}</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {localName(locale, d)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${idPrefix}-district`} label={t("filters.district")} error={errorText(errors?.districtId)}>
          <Select
            id={`${idPrefix}-district`}
            value={value.districtId}
            aria-invalid={Boolean(errors?.districtId)}
            aria-describedby={errors?.districtId ? `${idPrefix}-district-error` : undefined}
            onChange={(e) => {
              const d = districts.find((x) => String(x.id) === e.target.value);
              onChange({ ...value, districtId: e.target.value, divisionId: d ? String(d.parentId) : value.divisionId, upazilaId: "" });
            }}
          >
            <option value="">{t("location.chooseDistrict")}</option>
            {visibleDistricts.map((d) => (
              <option key={d.id} value={d.id}>
                {localName(locale, d)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${idPrefix}-upazila`} label={t("filters.upazila")} optionalLabel={t("common.optional")} error={errorText(errors?.upazilaId)}>
          <Select id={`${idPrefix}-upazila`} value={value.upazilaId} disabled={!value.districtId} onChange={(e) => onChange({ ...value, upazilaId: e.target.value })}>
            <option value="">{t("location.chooseUpazila")}</option>
            {upazilas.map((u) => (
              <option key={u.id} value={u.id}>
                {localName(locale, u)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${idPrefix}-locality`} label={t("location.locality")} optionalLabel={t("common.optional")} error={errorText(errors?.locality)}>
          <Input
            id={`${idPrefix}-locality`}
            value={value.locality}
            maxLength={100}
            placeholder={t("location.localityPlaceholder")}
            onChange={(e) => onChange({ ...value, locality: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
