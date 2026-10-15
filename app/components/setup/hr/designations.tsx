// app/components/setup/hr/designations.tsx

"use client";

import { useEffect, useState } from "react";

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";


export default function DesignationsTab() {

  return (
    <SetupDataGrid
      title="Employee Type"
      api="/api/hr/designations"
      fields={[
        { name: "name", label: "Name", required: true },
      ]}
      columns={[
        { name: "name", label: "Name", sortable: true },
      ]}
    />
  );
}
