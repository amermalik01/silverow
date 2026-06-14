// app/[slug]/setup/sales/order_stages/page.tsx

import RankedStagesTemplate from "@/app/components/setup/RankedStagesTemplate";
import { setupConfig } from "@/app/config/setupConfig";

export default function Page() {
  return <RankedStagesTemplate config={setupConfig.salesOrderStages} />;
}

/* "use client";

import { use, useState, useEffect } from "react";
import SetupDataGrid from "@/app/components/setup/SetupDataGrid";
import { setupConfig } from "@/app/config/setupConfig";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function OrderStagesSetupPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const config = setupConfig.salesOrderStages;
  const [refreshKey, setRefreshKey] = useState(0);
  const [stages, setStages] = useState<any[]>([]);

  // Fetch ordered list to determine up/down arrow buttons logic rendering context
  const fetchStages = async () => {
    try {
      const res = await fetch(config.api);
      if (res.ok) {
        const data = await res.json();
        setStages(data);
      }
    } catch (e) {
      console.error(
        "Failed fetching stages parameters matrix array mapping",
        e,
      );
    }
  };

  useEffect(() => {
    fetchStages();
  }, [refreshKey]);

  const handleRankMove = async (id: number, direction: "up" | "down") => {
    try {
      const res = await fetch(`${config.api}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) throw new Error("Rank modification event update rejected.");

      // Update key indexes state hooks to force data component refresh cycles triggers
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      alert(
        err.message ||
          "Failed to adjust sort sequence order ranking registry mapping row entries.",
      );
    }
  };

  return (
    <div className="space-y-6">
    
      <SetupDataGrid key={refreshKey} {...config} />


      <div className="border p-6 bg-white dark:bg-slate-900 rounded-lg shadow space-y-4 dark:border-slate-800">
        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">
          Arrange Workflow Stages Evaluation Display Order Sequence
        </h3>

        <div className="divide-y border rounded dark:border-slate-700 dark:divide-slate-700">
          {stages.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">
              No stages registered to arrange layout views context.
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
                  <span className="text-sm font-medium dark:text-slate-300">
                    {stage.name}
                  </span>
                </div>


                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleRankMove(stage.id, "up")}
                    disabled={idx === 0}
                    title="Move Up Step Line"
                    className="p-1.5 border rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    🔼
                  </button>
                  <button
                    onClick={() => handleRankMove(stage.id, "down")}
                    disabled={idx === stages.length - 1}
                    title="Move Down Step Line"
                    className="p-1.5 border rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:pointer-events-none transition"
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
} */
