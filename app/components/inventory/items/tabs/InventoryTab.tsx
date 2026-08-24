// app/components/inventory/items/tabs/InventoryTab.tsx

"use client";

import { Button } from "@/components/ui/button";

export default function InventoryTab({ itemId }: { itemId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Inventory Setup</h2>

        <p className="text-xs text-gray-500">
          Configure inventory behavior for this item
        </p>
      </div>

      {/* STOCK CONTROL */}

      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold">Stock Control</h3>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            Stock Tracking
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" />
            Allow Negative Stock
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" />
            Serialized Item
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" />
            Batch Tracked
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" />
            Has Expiry
          </label>
        </div>
      </div>

      {/* REORDER */}

      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold">Reorder Setup</h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block mb-1">Reorder Qty</label>
            <input type="number" className="border p-2 w-full rounded" />
          </div>

          <div>
            <label className="block mb-1">Minimum Qty</label>
            <input type="number" className="border p-2 w-full rounded" />
          </div>

          <div>
            <label className="block mb-1">Maximum Qty</label>
            <input type="number" className="border p-2 w-full rounded" />
          </div>
        </div>
      </div>

      {/* COSTING */}

      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold">Costing & Valuation</h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block mb-1">Costing Method</label>

            <select className="border p-2 w-full rounded">
              <option value="1">FIFO</option>
              <option value="2">Average</option>
              <option value="3">Standard</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">Valuation Method</label>

            <select className="border p-2 w-full rounded">
              <option value="1">Perpetual</option>
              <option value="2">Periodic</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">Standard Cost</label>
            <input type="number" className="border p-2 w-full rounded" />
          </div>
        </div>
      </div>

      {/* WAREHOUSE RULES */}

      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Warehouse Rules</h3>

          <Button variant="add_line"
            // className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            // className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5 px-3 py-2 rounded"
          >
            Add Warehouse Rule
          </Button>
        </div>

        <table className="w-full table-fixed border">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 text-left">Warehouse</th>
              <th className="p-2 text-left">Reorder</th>
              <th className="p-2 text-left">Max Stock</th>
              <th className="p-2 text-left">Safety Stock</th>
              <th className="p-2 text-left">Default</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-500">
                No warehouse rules configured
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ITEM SUMMARY */}

      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Inventory Summary</h3>
        <p className="text-xs text-gray-500">Item ID: {itemId}</p>
      </div>
    </div>
  );
}
