// app/[slug]/sales/crm/page.tsx

import CRMList from "@/app/components/sales/crm/CRMFormTabs";

export default function CRMPage() {
  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        Sales / CRM
      </h1>

      <CRMList />

    </div>
  );
}