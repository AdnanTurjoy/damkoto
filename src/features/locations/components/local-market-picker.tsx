"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/i18n/core";
import { haversineKm } from "@/lib/utils";
import type { LocationOption } from "../queries";

/** District shortcut; “near me” is resolved offline to the nearest district centroid. */
export function LocalMarketPicker({ districts }: { districts: LocationOption[] }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function locate() {
    if (!("geolocation" in navigator)) return setStatus(t("location.gpsUnavailable"));
    setStatus(t("location.locating"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const nearest = districts
          .filter((d) => d.lat != null && d.lng != null)
          .sort((a, b) => haversineKm(point, { lat: a.lat!, lng: a.lng! }) - haversineKm(point, { lat: b.lat!, lng: b.lng! }))[0];
        setStatus(null);
        if (nearest) router.push(`/prices?district=${nearest.id}`);
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? t("location.gpsDenied") : t("location.gpsUnavailable")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <label htmlFor="local-district" className="mb-1.5 block text-sm font-semibold">
        {t("home.localChoose")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select id="local-district" value={district} onChange={(e) => setDistrict(e.target.value)} className="sm:flex-1">
          <option value="">{t("filters.allDistricts")}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {localName(locale, d)}
            </option>
          ))}
        </Select>
        <Button disabled={!district} onClick={() => router.push(`/prices?district=${district}`)}>
          <MapPin /> {t("home.localSee")}
        </Button>
      </div>
      <Button variant="link" className="mt-2 h-auto" onClick={locate}>
        <LocateFixed /> {t("location.useMyLocation")}
      </Button>
      {status && (
        <p role="status" className="mt-1 text-sm text-muted">
          {status}
        </p>
      )}
    </div>
  );
}
