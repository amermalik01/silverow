// app/components/sales/crm/tabs/ActivitiesTab.tsx
"use client";

type Props = {
  module: string;
  recordId: string | undefined;
};

export default function ActivitiesTab({ module, recordId }: Props) {
  return (
    <div className="space-y-4">
      <button className="bg-blue-600 text-white px-3 py-1 rounded">
        + Add Activity
      </button>

      <div className="border rounded p-4">
        <p className="text-gray-500">Activity timeline will appear here</p>
      </div>
    </div>
  );
}
