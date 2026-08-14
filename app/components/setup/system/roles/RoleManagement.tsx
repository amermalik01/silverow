// app/components/setup/system/roles/RoleManagement.tsx
"use client";

import { useEffect, useState } from "react";
import RoleForm from "./RoleForm";
import PermissionMatrix from "./PermissionMatrix";

type Role = {
  id: string;
  code: string;
  name: string;
  description?: string;
};

type Permission = {
  id: string;
  module: string;
  action: string;
  code: string;
  display_name: string;
};

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);

  const [permissions, setPermissions] = useState<Permission[]>([]);

  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const [rolePermissions, setRolePermissions] = useState<string[]>([]);

  const loadRoles = async () => {
    const res = await fetch("/api/setup/roles");

    const json = await res.json();

    setRoles(json.data || []);
  };

  const loadRolePermissions = async (roleId: string) => {
    const res = await fetch(`/api/setup/roles/${roleId}/permissions`);

    const json = await res.json();

    setRolePermissions(json.permission_ids || []);
  };

  useEffect(() => {
    const loadRoles = async () => {
      const res = await fetch("/api/setup/roles");

      const json = await res.json();

      setRoles(json.data || []);
    };

    const loadPermissions = async () => {
      const res = await fetch("/api/setup/permissions");

      const json = await res.json();

      setPermissions(json.data || []);
    };
    loadRoles();

    loadPermissions();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      const loadRolePermissions = async (roleId: string) => {
        const res = await fetch(`/api/setup/roles/${roleId}/permissions`);

        const json = await res.json();

        setRolePermissions(json.permission_ids || []);
      };

      loadRolePermissions(selectedRole);
    }
  }, [selectedRole]);

  return (
    <div className="grid grid-cols-12 gap-6 rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm container mx-auto p-4">
      {/* LEFT */}
      <div className="col-span-4 space-y-6">
        <RoleForm onCreated={loadRoles} />

        <div className="border rounded p-4">
          <h2 className="font-semibold mb-4">Roles</h2>

          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full text-left border rounded p-3 ${
                  selectedRole === role.id ? "bg-blue-100 text-black border-blue-500" : ""
                }`}
              >
                <div className="font-medium">{role.name}</div>

                <div className="text-xs ">{role.code}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="col-span-8">
        {selectedRole ? (
          <PermissionMatrix
            roleId={selectedRole}
            permissions={permissions}
            selectedPermissions={rolePermissions}
            onUpdated={() => loadRolePermissions(selectedRole)}
          />
        ) : (
          <div className="border rounded p-10 text-center text-gray-500">
            Select a role to manage permissions
          </div>
        )}
      </div>
    </div>
  );
}
