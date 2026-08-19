// app/components/setup/system/roles/PermissionMatrix.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

type Permission = {
  id: string;
  module: string;
  action: string;
  code: string;
  display_name: string;
};

type Props = {
  roleId: string;
  permissions: Permission[];
  selectedPermissions: string[];
  onUpdated: () => void;
};

export default function PermissionMatrix({
  roleId,
  permissions,
  selectedPermissions,
  onUpdated,
}: Props) {
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<string[]>(selectedPermissions || []);

  const grouped = useMemo(() => {
    return permissions.reduce(
      (acc, permission) => {
        if (!acc[permission.module]) {
          acc[permission.module] = [];
        }

        acc[permission.module].push(permission);

        return acc;
      },
      {} as Record<string, Permission[]>,
    );
  }, [permissions]);

  const toggle = (permissionId: string) => {
    if (selected.includes(permissionId)) {
      setSelected(selected.filter((p) => p !== permissionId));
    } else {
      setSelected([...selected, permissionId]);
    }
  };

  const save = async () => {
    try {
      setSaving(true);

      await fetch(`/api/setup/roles/${roleId}/permissions`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          permission_ids: selected,
        }),
      });

      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Permissions</h2>

        <Button
          onClick={save}
          disabled={saving}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {saving ? "Saving..." : "Save Permissions"}
        </Button>
      </div>

      {Object.entries(grouped).map(([module, perms]) => (
        <div key={module} className="border rounded">
          <div className="bg-gray-100 text-black px-4 py-2 font-semibold capitalize">
            {module}
          </div>

          <div className="grid grid-cols-2 gap-2 p-4">
            {perms.map((perm) => (
              <label key={perm.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(perm.id)}
                  onChange={() => toggle(perm.id)}
                />

                <span>{perm.display_name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
