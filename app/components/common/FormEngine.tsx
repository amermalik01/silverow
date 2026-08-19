// components/common/FormEngine.tsx

"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

type TabRenderProps<T> = {
  record: T;
  setRecord: (value: T | ((prev: T) => T)) => void;
};

type TabConfig<T> = {
  key: string;
  label: string;
  render: (props: TabRenderProps<T>) => React.ReactNode;
};

type Props<T> = {
  record: T | null;
  setRecord: React.Dispatch<React.SetStateAction<T | null>>;

  tabs: TabConfig<T>[];

  onSave?: () => Promise<void>;
  loading?: boolean;
  readonly?: boolean;
};

function isUpdater<T>(val: T | ((prev: T) => T)): val is (prev: T) => T {
  return typeof val === "function";
}

export default function FormEngine<T>({
  record,
  setRecord,
  tabs,
  onSave,
  loading,
  readonly,
}: Props<T>) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key);

  if (loading || !record) {
    return <p>Loading...</p>;
  }

  const activeTabConfig = tabs.find((t) => t.key === activeTab);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1 ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 font-bold"
                : ""
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ✅ SAFE RENDER */}
      {activeTabConfig?.render({
        record,
        setRecord: (val) =>
          setRecord((prev) => {
            if (isUpdater(val)) {
              return val(prev as T);
            }
            return val;
          }),
      })}

      {!readonly && onSave && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
