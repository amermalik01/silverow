// app/components/setup/posting/InventorySystemSetup.tsx

"use client";

import { useEffect, useState } from "react";

type InventoryCostingMethod = "FIFO" | "WEIGHTED_AVERAGE" | "STANDARD";

type InventorySystem = "PERPETUAL" | "PERIODIC";

type InventorySetup = {
  inventory_system: InventorySystem;
  costing_method: InventoryCostingMethod;
};

const DEFAULT_SETUP: InventorySetup = {
  inventory_system: "PERIODIC",
  costing_method: "FIFO",
};

const INVENTORY_SYSTEM_OPTIONS: {
  value: InventorySystem;
  label: string;
}[] = [
  { value: "PERPETUAL", label: "Perpetual Inventory" },
  { value: "PERIODIC", label: "Periodic Inventory" },
];

const COSTING_OPTIONS: {
  value: InventoryCostingMethod;
  label: string;
}[] = [
  { value: "FIFO", label: "First In, First Out (FIFO)" },
  { value: "WEIGHTED_AVERAGE", label: "Weighted Average" },
  { value: "STANDARD", label: "Standard Costing" },
];

export default function InventorySystemSetup() {
  const [setup, setSetup] = useState<InventorySetup>(DEFAULT_SETUP);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadSetup() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/setup/posting/inventory-system", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load inventory setup.");
        }

        const data: InventorySetup = await response.json();

        setSetup({
          inventory_system:
            data.inventory_system ?? DEFAULT_SETUP.inventory_system,
          costing_method: data.costing_method ?? DEFAULT_SETUP.costing_method,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load inventory setup.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSetup();

    return () => controller.abort();
  }, []);

  async function saveSetting<K extends keyof InventorySetup>(
    field: K,
    value: InventorySetup[K],
  ) {
    if (loading || saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/setup/posting/inventory-system", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [field]: value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save inventory setup.");
      }

      setSetup((previous) => ({
        ...previous,
        [field]: data[field] ?? value,
      }));

      setSuccess("Inventory setup saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save inventory setup.",
      );
    } finally {
      setSaving(false);
    }
  }

  const disabled = loading || saving;

  return (
    <div className="space-y-3 text-slate-900 dark:text-white">
      {/* Inventory System */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">Inventory System</h2>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          {INVENTORY_SYSTEM_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap"
            >
              <input
                type="radio"
                name="inventory_system"
                value={option.value}
                checked={setup.inventory_system === option.value}
                disabled={disabled}
                onChange={() => saveSetting("inventory_system", option.value)}
                className="h-4 w-4 accent-blue-600"
              />

              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Inventory Costing Method */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">Inventory Costing Method</h2>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          {COSTING_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap"
            >
              <input
                type="radio"
                name="costing_method"
                value={option.value}
                checked={setup.costing_method === option.value}
                disabled={disabled}
                onChange={() => saveSetting("costing_method", option.value)}
                className="h-4 w-4 accent-blue-600"
              />

              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      {loading && (
        <p className="text-sm text-slate-500" role="status">
          Loading inventory settings...
        </p>
      )}

      {saving && (
        <p className="text-sm text-slate-500" role="status">
          Saving changes...
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-green-600" role="status">
          {success}
        </p>
      )}
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";

type InventoryCostingMethod = "FIFO" | "WEIGHTED_AVERAGE" | "STANDARD";

type InventorySystem = "PERPETUAL" | "PERIODIC";

type InventorySetup = {
  inventory_system: InventorySystem;
  costing_method: InventoryCostingMethod;
};

export default function InventorySystemSetup() {
  const [system, setSystem] = useState("PERIODIC");
  const [costingMethod, setCostingMethod] = useState("FIFO");

  useEffect(() => {
    fetch("/api/setup/posting/inventory-system")
      .then((r) => r.json())
      .then((d) => setSystem(d.inventory_system));
  }, []);

  const save = async (value: string, field: string) => {
    setSystem(value);
    setCostingMethod(field);

    await fetch("/api/setup/posting/inventory-system", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventory_system: value }),
    });
  };

  return (
    <>
      <div className="border p-6 rounded-xl flex flex-rows bg-white dark:bg-slate-900 text-black dark:text-white  space-x-6 shadow-sm">
        <h2 className="font-semibold text-lg">Inventory System</h2>

        <label className=" flex gap-2 pt-1 pl-8">
          <input
            type="radio"
            checked={system === "PERPETUAL"}
            onChange={() => save("PERPETUAL")}
            className="w-4 h-4 text-blue-600 px-2"
          />
          Perpetual Inventory
        </label>

        <label className="flex  gap-2 pt-1">
          <input
            type="radio"
            checked={system === "PERIODIC"}
            onChange={() => save("PERIODIC")}
            className="w-4 h-4 text-blue-600 p-2"
          />
          Periodic Inventory
        </label>
      </div>

      <div className="border p-6 rounded-xl flex flex-rows bg-white dark:bg-slate-900 text-black dark:text-white  space-x-6 shadow-sm">
        <h2 className="font-semibold text-lg">Inventory Costing Method</h2>

        <label className=" flex gap-2 pt-1 pl-8">
          <input
            type="radio"
            checked={system === "FIFO"}
            onChange={() => save("FIFO")}
            className="w-4 h-4 text-blue-600 px-2"
          />
          FIFO
        </label>

        <label className="flex  gap-2 pt-1">
          <input
            type="radio"
            checked={system === "WEIGHTED_AVERAGE"}
            onChange={() => save("WEIGHTED_AVERAGE")}
            className="w-4 h-4 text-blue-600 p-2"
          />
          WEIGHTED AVERAGE
        </label>

        <label className="flex  gap-2 pt-1">
          <input
            type="radio"
            checked={system === "STANDARD"}
            onChange={() => save("STANDARD")}
            className="w-4 h-4 text-blue-600 p-2"
          />
          STANDARD
        </label>
      </div>
    </>
  );
}
 */
