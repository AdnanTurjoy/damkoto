"use client";

import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const { bounds, center, tileUrl, attribution, maxZoom } = siteConfig.map;
export const BD_BOUNDS = L.latLngBounds([bounds[0], bounds[1]], [bounds[2], bounds[3]]);

export function markerIcon(label: string, options: { active?: boolean; approx?: boolean; size?: number } = {}) {
  const size = options.size ?? 30;
  return L.divIcon({
    className: "",
    html: `<div class="dk-marker${options.active ? " is-active" : ""}${options.approx ? " is-approx" : ""}" style="width:${size}px;height:${size}px">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function clusterIcon(count: number) {
  const size = count < 10 ? 36 : count < 100 ? 44 : 54;
  return L.divIcon({
    className: "",
    html: `<div class="dk-cluster" style="width:${size}px;height:${size}px">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function TileHealth({ onFail }: { onFail: () => void }) {
  const map = useMap();
  useEffect(() => {
    let errors = 0;
    let loaded = 0;
    const onError = () => {
      errors += 1;
      if (errors >= 6 && loaded === 0) onFail();
    };
    const onLoad = () => (loaded += 1);
    map.on("tileerror", onError);
    map.on("tileload", onLoad);
    return () => {
      map.off("tileerror", onError);
      map.off("tileload", onLoad);
    };
  }, [map, onFail]);
  return null;
}

/**
 * Leaflet map with the configured OSM-compatible tile provider. Swap the
 * provider via NEXT_PUBLIC_MAP_TILE_URL / NEXT_PUBLIC_MAP_ATTRIBUTION.
 */
export function BaseMap({
  children,
  className,
  zoom = 7,
  initialCenter,
  label,
  tilesErrorText,
  interactive = true,
}: {
  children?: React.ReactNode;
  className?: string;
  zoom?: number;
  initialCenter?: [number, number];
  label: string;
  tilesErrorText: string;
  interactive?: boolean;
}) {
  const [tilesFailed, setTilesFailed] = useState(false);
  return (
    <div className={cn("relative isolate overflow-hidden", className)} role="region" aria-label={label}>
      <MapContainer
        center={initialCenter ?? [center[0], center[1]]}
        zoom={zoom}
        minZoom={6}
        maxZoom={maxZoom}
        maxBounds={BD_BOUNDS.pad(0.3)}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        className="h-full w-full"
      >
        <TileLayer url={tileUrl} attribution={attribution} maxZoom={maxZoom} />
        <TileHealth onFail={() => setTilesFailed(true)} />
        {children}
      </MapContainer>
      {tilesFailed && (
        <p role="alert" className="absolute inset-x-3 top-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-sm font-medium text-red-700 shadow">
          {tilesErrorText}
        </p>
      )}
    </div>
  );
}
