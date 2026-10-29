"use client";

import { Marker } from "react-leaflet";
import { useI18n } from "@/lib/i18n/client";
import { BaseMap, markerIcon } from "./base-map";

export interface PreviewPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  approximate?: boolean;
}

export default function PreviewMapInner({ points, center, zoom }: { points: PreviewPoint[]; center?: [number, number]; zoom?: number }) {
  const { t } = useI18n();
  return (
    <BaseMap className="h-full w-full" initialCenter={center} zoom={zoom ?? 6} interactive={false} label={t("map.regionLabel")} tilesErrorText={t("map.tilesError")}>
      {points.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={markerIcon("৳", { approx: p.approximate, size: 24 })} title={p.label} keyboard={false} />
      ))}
    </BaseMap>
  );
}
