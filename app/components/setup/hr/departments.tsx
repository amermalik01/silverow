// app/components/setup/hr/departments.tsx

"use client";

import { useEffect, useState } from "react";

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";


export default function DepartmentsTab() {

  return (
    <SetupDataGrid
      title="Departments"
      api="/api/hr/departments"
      fields={[
        { name: "name", label: "Name", required: true },
      ]}
      columns={[
        { name: "name", label: "Name", sortable: true },
      ]}
    />
  );
}
