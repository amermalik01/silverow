// app/components/inventory/items/tabs/UOMTab.tsx

"use client";

export default function WarehouseTab({ itemId }: { itemId: string }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Warehouse Stock</h2>

      <div className="border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="p-3 text-left">Warehouse</th>

              <th className="p-3 text-left">Location</th>

              <th className="p-3 text-left">Quantity</th>

              <th className="p-3 text-left">Reserved</th>

              <th className="p-3 text-left">Available</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-500">
                No stock records found
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500">Item ID: {itemId}</p>
    </div>
  );
}
