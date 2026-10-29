"use client";

import { useEffect, useState } from "react";
import type { LocationOption } from "../queries";

const cache = new Map<number, LocationOption[]>();

/** Loads upazilas for a district on demand (cached per session). */
export function useUpazilas(districtId: number | null): LocationOption[] {
  const [loaded, setLoaded] = useState<{ id: number; list: LocationOption[] } | null>(null);

  useEffect(() => {
    if (!districtId || cache.has(districtId)) return;
    const controller = new AbortController();
    fetch(`/api/locations?district=${districtId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json: { ok: boolean; data?: { upazilas: LocationOption[] } }) => {
        if (json.ok && json.data) {
          cache.set(districtId, json.data.upazilas);
          setLoaded({ id: districtId, list: json.data.upazilas });
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [districtId]);

  if (!districtId) return [];
  return cache.get(districtId) ?? (loaded?.id === districtId ? loaded.list : []);
}
