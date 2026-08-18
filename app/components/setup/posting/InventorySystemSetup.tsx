// app/components/setup/posting/InventorySystemSetup.tsx

"use client";

import { useEffect, useState } from "react";

export default function InventorySystemSetup() {
  const [system, setSystem] = useState("PERIODIC");

  useEffect(() => {
    fetch("/api/setup/posting/inventory-system")
      .then((r) => r.json())
      .then((d) => setSystem(d.inventory_system));
  }, []);

  const save = async (value: string) => {
    setSystem(value);

    await fetch("/api/setup/posting/inventory-system", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventory_system: value }),
    });
  };

  return (
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
  );
}
