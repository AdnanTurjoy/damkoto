"use client";

import type { LeafletMouseEvent, Marker as LeafletMarker } from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import { useI18n } from "@/lib/i18n/client";
import { BaseMap, markerIcon } from "./base-map";

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e: LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ point }: { point: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (point && !map.getBounds().contains([point.lat, point.lng])) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 13));
  }, [map, point]);
  return null;
}

/** Tap to place, drag to adjust. Coordinates are rounded server-side before storage. */
export default function LocationPickerMap({
  point,
  onPick,
  center,
}: {
  point: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
  center?: [number, number];
}) {
  const { t } = useI18n();
  const markerRef = useRef<LeafletMarker>(null);
  const handlers = useMemo(
    () => ({
      dragend() {
        const ll = markerRef.current?.getLatLng();
        if (ll) onPick(ll.lat, ll.lng);
      },
    }),
    [onPick],
  );
  return (
    <BaseMap className="h-72 w-full rounded-xl border border-line" initialCenter={center} zoom={center ? 11 : 7} label={t("location.mapHint")} tilesErrorText={t("location.mapUnavailable")}>
      <ClickToPlace onPick={onPick} />
      <Recenter point={point} />
      {point && <Marker ref={markerRef} position={[point.lat, point.lng]} draggable eventHandlers={handlers} icon={markerIcon("৳", { active: true, size: 34 })} />}
    </BaseMap>
  );
}
