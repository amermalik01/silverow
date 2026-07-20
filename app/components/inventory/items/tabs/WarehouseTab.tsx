// app/components/inventory/items/tabs/WarehouseTab.tsx
"use client";

import { useEffect, useState } from "react";

import { WarehouseStock } from "@/types/inventory";

type Props = {
  itemId: string;
};

export default function WarehouseTab({
  itemId,
}: Props) {
  const [rows, setRows] = useState<
    WarehouseStock[]
  >([]);

  const [loading, setLoading] =
    useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/inventory/items/${itemId}/warehouse-stock`,
      );

      const data: WarehouseStock[] =
        await res.json();

      setRows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [itemId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Warehouse Stock
        </h2>
      </div>

      <div className="border rounded overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="p-3 text-left">
                Warehouse
              </th>

              <th className="p-3 text-left">
                Location
              </th>

              <th className="p-3 text-left">
                Batch
              </th>

              <th className="p-3 text-left">
                Serial
              </th>

              <th className="p-3 text-right">
                Quantity
              </th>

              <th className="p-3 text-right">
                Reserved
              </th>

              <th className="p-3 text-right">
                Available
              </th>

              <th className="p-3 text-right">
                Avg Cost
              </th>

              <th className="p-3 text-left">
                Last Movement
              </th>
            </tr>
          </thead>

          <tbody>
            {!loading &&
              rows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="p-4 text-center text-gray-500"
                  >
                    No stock found
                  </td>
                </tr>
              )}

            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t"
              >
                <td className="p-3">
                  {row.warehouse_name}
                </td>

                <td className="p-3">
                  {row.location_name || "-"}
                </td>

                <td className="p-3">
                  {row.batch_no || "-"}
                </td>

                <td className="p-3">
                  {row.serial_no || "-"}
                </td>

                <td className="p-3 text-right">
                  {Number(
                    row.quantity,
                  ).toFixed(2)}
                </td>

                <td className="p-3 text-right">
                  {Number(
                    row.reserved_quantity,
                  ).toFixed(2)}
                </td>

                <td className="p-3 text-right font-medium">
                  {Number(
                    row.available_quantity,
                  ).toFixed(2)}
                </td>

                <td className="p-3 text-right">
                  {row.average_cost
                    ? Number(
                        row.average_cost,
                      ).toFixed(2)
                    : "-"}
                </td>

                <td className="p-3">
                  {row.last_movement_at
                    ? new Date(
                        row.last_movement_at,
                      ).toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Item ID: {itemId}</p>
    </div>
  );
}

/* "use client";
import { useEffect, useState } from "react";

import {
  LocationOption,
  StockForm,
  WarehouseOption,
  WarehouseStock,
} from "@/types/inventory";

type Props = {
  itemId: string;
};

const defaultForm: StockForm = {
  warehouse_id: "",
  location_id: "",
  quantity: "0",
  reserved_quantity: "0",
  unit_cost: "",
  batch_no: "",
  serial_no: "",
  expiry_date: "",
};

export default function WarehouseTab({ itemId }: Props) {
  const [rows, setRows] = useState<WarehouseStock[]>([]);

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  const [locations, setLocations] = useState<LocationOption[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [showModal, setShowModal] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<StockForm>(defaultForm);



  const loadData = async () => {
    setLoading(true);

    try {
      const [stockRes, warehouseRes, locationRes] = await Promise.all([
        fetch(`/api/inventory/items/${itemId}/warehouse-stock`),

        fetch("/api/setup/inventory/warehouses"),

        fetch("/api/setup/inventory/warehouse-locations"),
      ]);

      const stockData = await stockRes.json();

      const warehouseData = await warehouseRes.json();

      const locationData = await locationRes.json();

      setRows(stockData);

      setWarehouses(warehouseData);

      setLocations(locationData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [itemId]);



  const filteredLocations = locations.filter(
    (loc) => loc.warehouse_id === form.warehouse_id,
  );


  const handleSubmit = async () => {
    setSaving(true);

    try {
      const method = editingId ? "PUT" : "POST";

      const url = editingId
        ? `/api/inventory/items/${itemId}/warehouse-stock/${editingId}`
        : `/api/inventory/items/${itemId}/warehouse-stock`;

      await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(form),
      });

      handleCloseModal();

      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };



  const handleEdit = (row: WarehouseStock) => {
    setEditingId(row.id);

    setForm({
      warehouse_id: row.warehouse_id,

      location_id: row.location_id,

      quantity: row.quantity,

      reserved_quantity: row.reserved_quantity,

      unit_cost: row.unit_cost || "",

      batch_no: row.batch_no || "",

      serial_no: row.serial_no || "",

      expiry_date: row.expiry_date ? row.expiry_date.split("T")[0] : "",
    });

    setShowModal(true);
  };



  const handleDelete = async (id: string) => {
    const ok = confirm("Delete stock record?");

    if (!ok) {
      return;
    }

    try {
      await fetch(`/api/inventory/items/${itemId}/warehouse-stock/${id}`, {
        method: "DELETE",
      });

      loadData();
    } catch (err) {
      console.error(err);
    }
  };



  const handleCloseModal = () => {
    setShowModal(false);

    setEditingId(null);

    setForm(defaultForm);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Warehouse Stock</h2>

        <button
          type="button"
          onClick={() => {
            setEditingId(null);

            setForm(defaultForm);

            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add Stock
        </button>
      </div>



      <div className="border rounded overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="p-3 text-left">Warehouse</th>

              <th className="p-3 text-left">Location</th>

              <th className="p-3 text-left">Quantity</th>

              <th className="p-3 text-left">Reserved</th>

              <th className="p-3 text-left">Available</th>

              <th className="p-3 text-left">Batch</th>

              <th className="p-3 text-left">Serial</th>

              <th className="p-3 text-left">Expiry</th>

              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-500">
                  No stock records found
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">{row.warehouse_name}</td>

                <td className="p-3">{row.location_name}</td>

                <td className="p-3">{row.quantity}</td>

                <td className="p-3">{row.reserved_quantity}</td>

                <td className="p-3">{row.available_quantity}</td>

                <td className="p-3">{row.batch_no}</td>

                <td className="p-3">{row.serial_no}</td>

                <td className="p-3">
                  {row.expiry_date
                    ? new Date(row.expiry_date).toLocaleDateString()
                    : ""}
                </td>

                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="text-blue-600"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      className="text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>



      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[900px] rounded p-6 space-y-4">
            <h3 className="text-lg font-semibold">
              {editingId ? "Edit Stock" : "Add Stock"}
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block mb-1">Warehouse</label>

                <select
                  value={form.warehouse_id}
                  onChange={(e) =>
                    setForm({
                      ...form,

                      warehouse_id: e.target.value,

                      location_id: "",
                    })
                  }
                  className="border p-2 w-full"
                >
                  <option value="">Select Warehouse</option>

                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1">Location</label>

                <select
                  value={form.location_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      location_id: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                >
                  <option value="">Select Location</option>

                  {filteredLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1">Quantity</label>

                <input
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      quantity: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>

              <div>
                <label className="block mb-1">Reserved Qty</label>

                <input
                  value={form.reserved_quantity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reserved_quantity: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>

              <div>
                <label className="block mb-1">Unit Cost</label>

                <input
                  value={form.unit_cost}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      unit_cost: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>

              <div>
                <label className="block mb-1">Batch No</label>

                <input
                  value={form.batch_no}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      batch_no: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>

              <div>
                <label className="block mb-1">Serial No</label>

                <input
                  value={form.serial_no}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      serial_no: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>

              <div>
                <label className="block mb-1">Expiry Date</label>

                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      expiry_date: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="border px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} */

/* "use client";

export default function WarehouseTab({ itemId }: { itemId: string }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Warehouse Stock</h2>

      <div className="border rounded overflow-auto">
        <table className="w-full text-xs">
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

      <p className="text-xs text-gray-500">Item ID: {itemId}</p>
    </div>
  );
} */
