// app/components/sales/crm/tabs/OpportunitiesTab.tsx
"use client";

import { Button } from "@/components/ui/button";

export default function OpportunitiesTab({
  partyId,
}: {
  partyId: string | undefined;
}) {
  return (
    <div className="space-y-4">
      <Button className="bg-green-600 text-white px-3 py-1 rounded">
        + New Opportunity
      </Button>

      <div className="border rounded p-4">
        <p className="text-gray-500">Opportunities will appear here</p>
      </div>
    </div>
  );
}
