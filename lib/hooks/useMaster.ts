// lib/hooks/useMaster.ts

"use client";

import { useEffect, useState } from "react";
import { MASTER_API_MAP, MasterType } from "@/lib/master/masterRegistry";

export type MasterItem = {
  id: string;
  name: string;
  code?: string | null;
};

const cache: Record<string, MasterItem[]> = {};
const loaded: Record<string, boolean> = {};

export function useMaster(type: MasterType) {
  // ✅ lazy init (no setState needed for cache restore)
  const [data, setData] = useState<MasterItem[]>(() => cache[type] || []);

  useEffect(() => {
    // already loaded → do nothing
    if (loaded[type]) return;

    const load = async () => {
      try {
        const res = await fetch(MASTER_API_MAP[type]);
        const json: MasterItem[] = await res.json();

        cache[type] = json;
        loaded[type] = true;

        setData(json); // only update once after fetch
      } catch (err) {
        console.error("Master data load failed:", err);
      }
    };

    load();
  }, [type]);

  return data;
}
