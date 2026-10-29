"use client";

import type { Map as LeafletMap } from "leaflet";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { formatTaka } from "@/lib/i18n/core";
import { formatQuantity } from "@/features/prices/format";
import { freshnessLabel, getFreshness } from "@/features/prices/freshness";
import { cloudinaryUrl } from "@/lib/images";
import type { MapData, MapPoint } from "../queries";
import { BaseMap, BD_BOUNDS, clusterIcon, markerIcon } from "./base-map";

export interface Viewport {
  bbox: [number, number, number, number];
  zoom: number;
}

function ViewportWatcher({ onChange }: { onChange: (v: Viewport) => void }) {
  const lastKey = useRef("");
  const fitted = useRef(false);
  const map = useMapEvents({
    moveend: () => emit(),
  });

  // Only report real, changed viewports. A hidden (0×0) map — e.g. the
  // mobile list tab — makes Leaflet emit degenerate bounds repeatedly,
  // which would otherwise loop through parent state updates.
  const emit = () => {
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;
    const b = map.getBounds();
    const bbox: Viewport["bbox"] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    const zoom = map.getZoom();
    const key = `${bbox.map((n) => n.toFixed(4)).join(",")}@${zoom}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    onChange({ bbox, zoom });
  };

  useEffect(() => {
    const container = map.getContainer();
    const fitWhenVisible = () => {
      map.invalidateSize({ animate: false });
      const size = map.getSize();
      if (size.x === 0 || size.y === 0) return;
      if (!fitted.current) {
        fitted.current = true;
        map.fitBounds(BD_BOUNDS, { animate: false });
      }
      emit();
    };
    fitWhenVisible();
    // Re-measure when the container is shown or resized (mobile map/list toggle).
    const observer = new ResizeObserver(fitWhenVisible);
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- attach once per map instance
  }, [map]);
  return null;
}

function FlyTo({ target }: { target: { lat: number; lng: number; zoom: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.6 });
  }, [map, target]);
  return null;
}

function PopupList({ points }: { points: MapPoint[] }) {
  const { locale, t } = useI18n();
  return (
    <div className="space-y-2.5">
      {points.length > 1 && <p className="text-xs font-semibold text-muted">{t("map.reportsHere", { count: points.length })}</p>}
      {points.slice(0, 5).map((p) => (
        <div key={p.id} className="flex gap-2.5">
          {p.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- tiny Cloudinary thumbnail
            <img src={cloudinaryUrl(p.imageUrl, 96)} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0 text-[13px] leading-snug">
            <p className="truncate text-sm font-bold">{p.productName}</p>
            <p className="font-semibold text-brand-700">
              {formatTaka(locale, p.price)} / {formatQuantity(locale, t, p.quantity, p.unit)}
            </p>
            <p className="text-muted">
              {freshnessLabel(t, getFreshness(p.reportDate))}
              {p.approximate && ` · ${t("map.legendApprox")}`}
              {p.isDemo && ` · ${t("common.demo")}`}
            </p>
            <Link href={`/prices/${p.id}`} className="font-semibold text-brand-700 underline">
              {t("map.open")}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ExplorerMap({
  data,
  activeId,
  onSelect,
  onViewport,
  flyTarget,
}: {
  data: MapData | null;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onViewport: (v: Viewport) => void;
  flyTarget: { lat: number; lng: number; zoom: number } | null;
}) {
  const { t } = useI18n();
  const mapRef = useRef<LeafletMap | null>(null);
  const setMapRef = useCallback((m: LeafletMap) => {
    mapRef.current = m;
  }, []);
  // Several reports often share one approximate point; show them as one marker.
  const groups = useMemo(() => {
    if (data?.mode !== "points") return [];
    const byPoint = new Map<string, MapPoint[]>();
    for (const p of data.points) {
      const key = `${p.lat},${p.lng}`;
      byPoint.set(key, [...(byPoint.get(key) ?? []), p]);
    }
    return [...byPoint.values()];
  }, [data]);

  return (
    <BaseMap className="h-full w-full" label={t("map.regionLabel")} tilesErrorText={t("map.tilesError")}>
      <ViewportWatcher onChange={onViewport} />
      <FlyTo target={flyTarget} />
      <MapRefSetter onReady={setMapRef} />
      {data?.mode === "clusters" &&
        data.clusters.map((c, i) => (
          <Marker
            key={`c${i}-${c.lat}-${c.lng}`}
            position={[c.lat, c.lng]}
            icon={clusterIcon(c.count)}
            title={t("map.clusterHint", { count: c.count })}
            eventHandlers={{ click: () => mapRef.current?.flyTo([c.lat, c.lng], Math.min((mapRef.current?.getZoom() ?? 7) + 2, 16)) }}
          />
        ))}
      {groups.map((points) => {
        const first = points[0];
        const active = points.some((p) => p.id === activeId);
        return (
          <Marker
            key={first.id}
            position={[first.lat, first.lng]}
            icon={markerIcon(points.length > 1 ? String(points.length) : "৳", { active, approx: first.approximate })}
            title={first.productName}
            keyboard
            zIndexOffset={active ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(first.id) }}
          >
            <Popup>
              <PopupList points={points} />
            </Popup>
          </Marker>
        );
      })}
    </BaseMap>
  );
}

function MapRefSetter({ onReady }: { onReady: (map: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}
