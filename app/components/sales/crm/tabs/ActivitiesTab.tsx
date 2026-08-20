// app/components/sales/crm/tabs/ActivitiesTab.tsx
"use client";

import { Button } from "@/components/ui/button";

type Props = {
  module: string;
  recordId: string | undefined;
};

export default function ActivitiesTab({ module, recordId }: Props) {
  return (
    <div className="space-y-4">
      <Button
        variant="add_line"
        // className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        Add Activity
      </Button>

      <div className="border rounded p-4">
        <p className="text-gray-500">Activity timeline will appear here</p>
      </div>
    </div>
  );
}
