// app/[slug]/setup/system/roles/page.tsx

import RoleManagement from "@/app/components/setup/system/roles/RoleManagement";

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Setup / System / Roles & Permissions
      </h1>

      <RoleManagement />
    </div>
  );
}
