// app/components/inventory/items/tabs/UOMTab.tsx

"use client";

export default function UOMTab({ itemId }: { itemId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">UOM Conversions</h2>

        <button
          type="button"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add UOM
        </button>
      </div>

      <div className="border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="p-3 text-left">UOM</th>

              <th className="p-3 text-left">Conversion Factor</th>

              <th className="p-3 text-left">Barcode</th>

              <th className="p-3 text-left">Weight</th>

              <th className="p-3 text-left">Volume</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-500">
                No UOMs found
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500">Item ID: {itemId}</p>
    </div>
  );
}
