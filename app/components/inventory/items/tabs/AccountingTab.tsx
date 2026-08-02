// app/components/inventory/items/tabs/AccountingTab.tsx

"use client";

import { useEffect, useState } from "react";
import { ItemFormData } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

type AccountGroupOption = {
  id: string;
  name: string;
  inventory_account?: string;
  cogs_account?: string;
  adjustment_account?: string;
};

type Props = {
  item: ItemFormData;
  setItem: React.Dispatch<React.SetStateAction<ItemFormData>>;
  isReadonly?: boolean;
};

type ActiveOverrideTarget = "inventory" | "cogs" | "sales" | "purchase" | null;

export default function AccountingTab({
  item,
  setItem,
  isReadonly = false,
}: Props) {
  const [postingGroups, setPostingGroups] = useState<AccountGroupOption[]>([]);
  const [showOverrides, setShowOverrides] = useState(false);
  const [activeModalTarget, setActiveModalTarget] =
    useState<ActiveOverrideTarget>(null);

  const [overrideLabels, setOverrideLabels] = useState({
    inventory: "",
    cogs: "",
    sales: "",
    purchase: "",
  });

  useEffect(() => {
    async function fetchPostingGroups() {
      try {
        const res = await fetch("/api/setup/posting/inventory-groups");
        if (res.ok) {
          const data: AccountGroupOption[] = await res.json();
          setPostingGroups(data);

          // Safe check to auto-select initial group
          if (!item?.inventory_posting_group_id && data.length > 0) {
            setItem((prev) => ({
              ...prev,
              inventory_posting_group_id: data[0].id,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load inventory posting groups", err);
      }
    }
    fetchPostingGroups();
  }, []);

  const selectedGroup = postingGroups.find(
    (g) => g.id === item?.inventory_posting_group_id,
  );

  const handleSelectGL = (gl: GLAccountLookupRecord) => {
    if (!activeModalTarget) return;

    const keyMap: Record<
      NonNullable<ActiveOverrideTarget>,
      keyof ItemFormData
    > = {
      inventory: "inventory_gl_id",
      cogs: "cogs_gl_id",
      sales: "sales_gl_id",
      purchase: "purchase_gl_id",
    };

    const targetKey = keyMap[activeModalTarget];

    setItem((prev) => ({
      ...prev,
      [targetKey]: gl.id,
    }));

    setOverrideLabels((prev) => ({
      ...prev,
      [activeModalTarget]: `${gl.code} - ${gl.name}`,
    }));

    setActiveModalTarget(null);
  };

  const clearOverride = (target: NonNullable<ActiveOverrideTarget>) => {
    const keyMap: Record<
      NonNullable<ActiveOverrideTarget>,
      keyof ItemFormData
    > = {
      inventory: "inventory_gl_id",
      cogs: "cogs_gl_id",
      sales: "sales_gl_id",
      purchase: "purchase_gl_id",
    };

    setItem((prev) => ({
      ...prev,
      [keyMap[target]]: "",
    }));

    setOverrideLabels((prev) => ({
      ...prev,
      [target]: "",
    }));
  };

  return (
    <div className="space-y-6 text-xs max-w-4xl">
      {/* 1. Primary Assignment: Inventory Posting Group */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            Inventory Posting Group (UK Default Rules)
          </h3>
          <p className="text-slate-500">
            Automatically routes stock movements, cost of goods, and adjustments
            to standard UK GAAP ledger accounts.
          </p>
        </div>

        <div className="max-w-md">
          <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
            Posting Group Profile
          </label>
          <select
            disabled={isReadonly}
            value={item?.inventory_posting_group_id || ""}
            onChange={(e) =>
              setItem((prev) => ({
                ...prev,
                inventory_posting_group_id: e.target.value,
              }))
            }
            className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {postingGroups.length === 0 && (
              <option value="">-- Standard UK Inventory Default --</option>
            )}
            {postingGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Effective Accounts Preview */}
      <div className="space-y-2">
        <h4 className="font-semibold text-slate-700 dark:text-slate-300">
          Effective Resolved Accounts
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900">
            <label className="text-slate-500 font-medium block mb-1">
              Inventory Asset GL
            </label>
            <p className="font-mono text-slate-800 dark:text-slate-200 font-medium">
              {item?.inventory_gl_id
                ? overrideLabels.inventory || "Custom Direct Override"
                : selectedGroup?.inventory_account ||
                  "1000 - Stock / Inventory"}
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900">
            <label className="text-slate-500 font-medium block mb-1">
              Cost of Goods Sold (COGS) GL
            </label>
            <p className="font-mono text-slate-800 dark:text-slate-200 font-medium">
              {item?.cogs_gl_id
                ? overrideLabels.cogs || "Custom Direct Override"
                : selectedGroup?.cogs_account || "5000 - Cost of Sales"}
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900">
            <label className="text-slate-500 font-medium block mb-1">
              Stock Adjustment GL
            </label>
            <p className="font-mono text-slate-800 dark:text-slate-200 font-medium">
              {selectedGroup?.adjustment_account ||
                "5010 - Stock Write-Off / Adj"}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Modal-driven Specific Overrides */}
      {!isReadonly && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowOverrides(!showOverrides)}
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
          >
            {showOverrides
              ? "Hide Specific GL Overrides"
              : "Configure Custom GL Overrides"}
          </button>

          {showOverrides && (
            <div className="mt-3 p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl space-y-4">
              <p className="text-slate-500">
                Override individual GL accounts using the lookup modal. Leave
                empty to maintain automatic posting group values.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inventory Asset Override */}
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Override Inventory Asset Account
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      placeholder="Posting Group Default"
                      value={
                        overrideLabels.inventory || item?.inventory_gl_id || ""
                      }
                      className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveModalTarget("inventory")}
                      className="h-9 px-3"
                    >
                      <Icon icon="lucide:search" className="w-4 h-4" />
                    </Button>
                    {item?.inventory_gl_id && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => clearOverride("inventory")}
                        className="h-9 px-2 text-red-500 hover:text-red-700"
                      >
                        <Icon icon="lucide:x" className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* COGS Override */}
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Override Cost of Goods Sold Account
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      placeholder="Posting Group Default"
                      value={overrideLabels.cogs || item?.cogs_gl_id || ""}
                      className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveModalTarget("cogs")}
                      className="h-9 px-3"
                    >
                      <Icon icon="lucide:search" className="w-4 h-4" />
                    </Button>
                    {item?.cogs_gl_id && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => clearOverride("cogs")}
                        className="h-9 px-2 text-red-500 hover:text-red-700"
                      >
                        <Icon icon="lucide:x" className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shared GL Lookup Modal Integration */}
      <GLAccountLookupModal
        open={activeModalTarget !== null}
        onClose={() => setActiveModalTarget(null)}
        onSelect={handleSelectGL}
      />
    </div>
  );
}
