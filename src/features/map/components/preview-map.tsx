"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { PreviewPoint } from "./preview-map-inner";

const Inner = dynamic(() => import("./preview-map-inner"), { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-none" /> });

/** Lightweight, non-interactive map preview (homepage and report detail). */
export function PreviewMap(props: { points: PreviewPoint[]; center?: [number, number]; zoom?: number; className?: string }) {
  return (
    <div className={props.className}>
      <Inner points={props.points} center={props.center} zoom={props.zoom} />
    </div>
  );
}
