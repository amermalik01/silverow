// app/components/setup/system/roles/PermissionMatrix.tsx


// app/components/setup/system/roles/PermissionMatrix.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Fragment, useMemo, useState } from "react";

type Permission = {
  id: string;
  module: string;
  parent_module?: string;
  module_display_name?: string;
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

const ACTIONS = [
  "view",
  "add",
  "edit",
  "delete",
  "approved",
  "convert",
  "dispatch",
  "receive",
  "post",
];

export default function PermissionMatrix({
  roleId,
  permissions,
  selectedPermissions,
  onUpdated,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>(selectedPermissions || []);
  
  // Track collapsed state for modules: Record<moduleName, boolean>
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Group permissions by Module -> Sub-module
  const grouped = useMemo(() => {
    const map: Record<string, Record<string, Permission[]>> = {};
    permissions.forEach((p) => {
      const mod = p.parent_module ? p.parent_module : p.module;
      const sub = p.parent_module ? p.module : "General";

      if (!map[mod]) map[mod] = {};
      if (!map[mod][sub]) map[mod][sub] = [];
      map[mod][sub].push(p);
    });
    return map;
  }, [permissions]);

  const toggleCollapse = (moduleName: string) => {
    setCollapsed((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  const toggle = (permissionId: string) => {
    setSelected((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleRow = (rowPerms: Permission[]) => {
    const rowIds = rowPerms.map((p) => p.id);
    const allSelected = rowIds.every((id) => selected.includes(id));
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !rowIds.includes(id)));
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...rowIds])));
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      await fetch(`/api/setup/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission_ids: selected }),
      });
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-white dark:bg-slate-900 space-y-6 shadow-sm">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="font-semibold text-lg">Roles and Permissions Matrix</h2>
        <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-xs capitalize text-slate-500 bg-slate-50 dark:bg-slate-800">
              <th className="p-3">Tab Name</th>
              <th className="p-3 text-center">Check All</th>
              {ACTIONS.map((action) => (
                <th key={action} className="p-3 text-center capitalize">
                  {action}
                </th>
              ))}
              <th className="p-3 text-center">Inherit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {Object.entries(grouped).map(([moduleName, subModules]) => {
              const isCollapsed = collapsed[moduleName] || false;
              const allModulePerms = Object.values(subModules).flat();

              return (
                <Fragment key={moduleName}>
                  {/* Parent Module Header Row */}
                  <tr className="bg-slate-100 dark:bg-slate-800/50 font-semibold">
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={() => toggleCollapse(moduleName)}
                        className="flex items-center gap-2 text-left w-full focus:outline-none"
                      >
                        <span>{isCollapsed ? "+" : "—"}</span>
                        <span className="capitalize">{moduleName}</span>
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={
                          allModulePerms.length > 0 &&
                          allModulePerms.every((p) => selected.includes(p.id))
                        }
                        onChange={() => toggleRow(allModulePerms)}
                      />
                    </td>
                    {ACTIONS.map((act) => (
                      <td key={act} className="p-3 text-center" />
                    ))}
                    <td className="p-3 text-center">
                      <button className="px-3 py-1 text-xs border rounded bg-white dark:bg-slate-700 hover:bg-slate-50">
                        Inherit
                      </button>
                    </td>
                  </tr>

                  {/* Sub-modules / Tabs (Render only if not collapsed) */}
                  {!isCollapsed &&
                    Object.entries(subModules).map(([subName, perms]) => (
                      <tr key={subName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 pl-8 text-slate-600 dark:text-slate-400 capitalize">
                          {subName}
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={
                              perms.length > 0 &&
                              perms.every((p) => selected.includes(p.id))
                            }
                            onChange={() => toggleRow(perms)}
                          />
                        </td>
                        {ACTIONS.map((act) => {
                          const perm = perms.find(
                            (p) => p.action.toLowerCase() === act
                          );
                          return (
                            <td key={act} className="p-3 text-center">
                              {perm ? (
                                <input
                                  type="checkbox"
                                  checked={selected.includes(perm.id)}
                                  onChange={() => toggle(perm.id)}
                                />
                              ) : null}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center">
                          <button className="px-3 py-1 text-xs border rounded bg-white dark:bg-slate-700 hover:bg-slate-50">
                            Inherit
                          </button>
                        </td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}



/* "use client";

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
          variant="save"
        >
          {saving ? "Saving..." : "Save"}
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
} */
