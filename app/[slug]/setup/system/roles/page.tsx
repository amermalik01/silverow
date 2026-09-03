// app/[slug]/setup/system/roles/page.tsx

import RoleManagement from "@/app/components/setup/system/roles/RoleManagement";

export default function RolesPage() {
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">
          Setup / System / Roles & Permissions
        </h1>
      </div>

      <RoleManagement />
    </div>
  );
}
