"use client";

import { List, Loader2, Map as MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { LocationOption } from "@/features/locations/queries";
import { PriceReportCard } from "@/features/prices/components/price-report-card";
import type { Paginated, ReportSummary } from "@/features/prices/queries";
import type { MapData } from "../queries";
import type { Viewport } from "./explorer-map";

const ExplorerMap = dynamic(() => import("./explorer-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

/**
 * Map + list kept in sync: both query the same URL filters and the visible
 * map area. Selecting a marker highlights the report in the list; hovering a
 * list item highlights its marker.
 */
export function MapExplorer({ districts }: { districts: LocationOption[] }) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [data, setData] = useState<MapData | null>(null);
  const [list, setList] = useState<Paginated<ReportSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [reloadKey, setReloadKey] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("bbox");
    params.delete("page");
    return params.toString();
  }, [searchParams]);

  const district = searchParams.get("district");
  const flyTarget = useMemo(() => {
    const d = districts.find((x) => String(x.id) === district);
    return d?.lat != null && d?.lng != null ? { lat: d.lat, lng: d.lng, zoom: 10 } : null;
  }, [district, districts]);

  useEffect(() => {
    if (!viewport) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      const params = new URLSearchParams(filterQuery);
      params.set("bbox", viewport.bbox.map((n) => n.toFixed(4)).join(","));
      params.set("zoom", String(viewport.zoom));
      try {
        const [mapRes, listRes] = await Promise.all([
          fetch(`/api/prices/map?${params}`, { signal: controller.signal }).then((r) => r.json()),
          fetch(`/api/prices?${params}&pageSize=30`, { signal: controller.signal }).then((r) => r.json()),
        ]);
        if (!mapRes.ok || !listRes.ok) throw new Error("failed");
        setData(mapRes.data);
        setList(listRes.data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filterQuery, viewport, reloadKey]);

  const select = useCallback((id: string | null) => {
    setActiveId(id);
    if (id) {
      requestAnimationFrame(() => listRef.current?.querySelector(`[data-report="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    }
  }, []);

  return (
    <div>
      <div className="mb-3 inline-flex rounded-xl border border-line bg-white p-1 lg:hidden" role="tablist">
        {(["map", "list"] as const).map((view) => (
          <button
            key={view}
            role="tab"
            aria-selected={mobileView === view}
            onClick={() => setMobileView(view)}
            className={cn("inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold", mobileView === view ? "bg-brand-600 text-white" : "text-muted")}
          >
            {view === "map" ? <MapIcon className="size-4" /> : <List className="size-4" />}
            {view === "map" ? t("map.showMap") : t("map.showList")}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
        <div className={cn("relative h-[68vh] min-h-[420px] overflow-hidden rounded-2xl border border-line lg:h-[calc(100vh-12rem)]", mobileView === "list" && "hidden lg:block")}>
          <ExplorerMap data={data} activeId={hoverId ?? activeId} onSelect={select} onViewport={setViewport} flyTarget={flyTarget} />
          {loading && (
            <div className="absolute left-1/2 top-3 z-[500] flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium shadow" role="status">
              <Loader2 className="size-4 animate-spin" /> {t("map.loading")}
            </div>
          )}
          <MapLegend />
        </div>

        <section aria-label={t("map.showList")} className={cn("min-w-0", mobileView === "map" && "hidden lg:block")}>
          <p className="mb-3 text-sm font-semibold" aria-live="polite">
            {data ? t("map.inView", { count: data.total }) : t("map.loading")}
          </p>
          {error ? (
            <ErrorState text={t("map.error")} onRetry={() => setReloadKey((k) => k + 1)} />
          ) : list && list.items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-white/60 p-6 text-center text-[15px] text-muted">{t("map.empty")}</p>
          ) : (
            <ul ref={listRef} className="space-y-3 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:pr-1">
              {(list?.items ?? []).map((report) => (
                <li key={report.id} data-report={report.id}>
                  <PriceReportCard report={report} compact highlighted={report.id === activeId} onHover={setHoverId} />
                </li>
              ))}
              {!list && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function MapLegend() {
  const { t } = useI18n();
  return (
    <details className="absolute bottom-3 left-3 z-[500] max-w-[15rem] rounded-xl bg-white/95 p-3 text-[13px] shadow">
      <summary className="cursor-pointer font-semibold">{t("map.legend")}</summary>
      <ul className="mt-2 space-y-1.5">
        <li className="flex items-center gap-2">
          <span className="dk-marker size-5 text-[10px]">৳</span> {t("map.legendReport")}
        </li>
        <li className="flex items-center gap-2">
          <span className="dk-cluster size-6 text-[10px]">9</span> {t("map.legendCluster")}
        </li>
        <li className="flex items-center gap-2">
          <span className="dk-marker is-approx size-5 text-[10px]">৳</span> {t("map.legendApprox")}
        </li>
      </ul>
    </details>
  );
}
