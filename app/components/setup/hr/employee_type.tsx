// app/components/setup/hr/employee_type.tsx

"use client";

import { useEffect, useState } from "react";

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";


export default function EmployeeTypeTab() {

  return (
    <SetupDataGrid
      title="Employee Type"
      api="/api/hr/employee_type"
      fields={[
        { name: "name", label: "Name", required: true },
      ]}
      columns={[
        { name: "name", label: "Name", sortable: true },
      ]}
    />
  );
}
