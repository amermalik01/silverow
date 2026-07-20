// app/components/setup/RankedStagesTemplate.tsx

"use client";

import { useState, useEffect } from "react";
import SetupDataGrid from "@/app/components/setup/SetupDataGrid";
import { SetupConfig } from "@/app/config/setupConfig";

interface OrderStage {
  id: number;
  company_id: number;
  stage_type: string;
  name: string;
  rank: number;
  created_at: string;
  updated_at: string;
}

interface RankedStagesTemplateProps {
  config: SetupConfig;
}

export default function RankedStagesTemplate({
  config,
}: RankedStagesTemplateProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [stages, setStages] = useState<OrderStage[]>([]);

  const fetchStages = async () => {
    try {
      const res = await fetch(config.api);
      if (res.ok) {
        const data = await res.json();
        setStages(data);
      }
    } catch (e) {
      console.error("Failed fetching configuration steps layout order", e);
    }
  };

  useEffect(() => {
    fetchStages();
  }, [refreshKey, config.api]);

  const handleRankMove = async (id: number, direction: "up" | "down") => {
    try {
      const res = await fetch(`${config.api}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) throw new Error("Rank modification update rejected.");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      const dbError = err as { code?: string; message?: string };
      alert(dbError || "Failed to adjust display sequencing position indices.");
    }
  };

  return (
    <div className="space-y-6">
      <SetupDataGrid key={refreshKey} {...config} />

      <div className="border p-6 bg-white dark:bg-slate-900 rounded-lg shadow space-y-4 dark:border-slate-800">
        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">
          Arrange Workflow Process Display Order Sequence
        </h3>

        <div className="divide-y border rounded dark:border-slate-700 dark:divide-slate-700">
          {stages.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">
              No active row items recorded yet. Use the tool form interface
              section row panel to populate items.
            </div>
          ) : (
            stages.map((stage, idx) => (
              <div
                key={stage.id}
                className="flex items-center justify-between p-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xs bg-gray-100 dark:bg-slate-800 border px-2 py-0.5 rounded text-gray-500">
                    Pos: {idx + 1}
                  </span>
                  <span className="text-xs font-medium dark:text-slate-300">
                    {stage.name}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleRankMove(stage.id, "up")}
                    disabled={idx === 0}
                    className="p-1.5 border rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    🔼
                  </button>
                  <button
                    onClick={() => handleRankMove(stage.id, "down")}
                    disabled={idx === stages.length - 1}
                    className="p-1.5 border rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    🔽
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
