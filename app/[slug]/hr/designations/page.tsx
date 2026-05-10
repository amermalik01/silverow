// app/[slug]/hr/designations/page.tsx

import DesignationList from "@/app/components/hr/designations/DesignationList";

export default function DesignationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Human Resource / Designations</h1>

      <DesignationList />
    </div>
  );
}
