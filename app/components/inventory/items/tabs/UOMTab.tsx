// app/components/inventory/items/tabs/UOMTab.tsx

"use client";

import { useEffect, useState } from "react";

import { ItemUOM, UOMForm, UOMOption } from "@/types/inventory";

type Props = {
  itemId: string;
};

const defaultForm: UOMForm = {
  uom_id: "",

  conversion_factor: "1",

  barcode: "",

  weight: "",

  volume: "",

  is_base: false,
};

export default function UOMTab({ itemId }: Props) {
  const [rows, setRows] = useState<ItemUOM[]>([]);

  const [uoms, setUoms] = useState<UOMOption[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [showModal, setShowModal] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<UOMForm>(defaultForm);

  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);

    try {
      const [uomRes, itemUomRes] = await Promise.all([
        fetch("/api/setup/inventory/uoms"),

        fetch(`/api/inventory/items/${itemId}/uoms`),
      ]);

      const uomData: UOMOption[] = await uomRes.json();

      const itemUomData: ItemUOM[] = await itemUomRes.json();

      setUoms(uomData);

      setRows(itemUomData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [itemId]);

  /*
    CREATE / UPDATE
  */

  const handleSubmit = async () => {
    setSaving(true);

    try {
      const method = editingId ? "PUT" : "POST";

      const url = editingId
        ? `/api/inventory/items/${itemId}/uoms/${editingId}`
        : `/api/inventory/items/${itemId}/uoms`;

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

  /*
    EDIT
  */

  const handleEdit = (row: ItemUOM) => {
    setEditingId(row.id);

    setForm({
      uom_id: row.uom_id,

      conversion_factor: row.conversion_factor,

      barcode: row.barcode || "",

      weight: row.weight || "",

      volume: row.volume || "",

      is_base: row.is_base,
    });

    setShowModal(true);
  };

  /*
    DELETE
  */

  const handleDelete = async (id: string) => {
    const ok = confirm("Delete this UOM conversion?");

    if (!ok) {
      return;
    }

    try {
      await fetch(`/api/inventory/items/${itemId}/uoms/${id}`, {
        method: "DELETE",
      });

      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  /*
    RESET MODAL
  */

  const handleCloseModal = () => {
    setShowModal(false);

    setEditingId(null);

    setForm(defaultForm);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">UOM Conversions</h2>

        <button
          type="button"
          onClick={() => {
            setEditingId(null);

            setForm(defaultForm);

            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add UOM
        </button>
      </div>

      {/* TABLE */}

      <div className="border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="p-3 text-left">UOM</th>

              <th className="p-3 text-left">Base</th>

              <th className="p-3 text-left">Conversion</th>

              <th className="p-3 text-left">Barcode</th>

              <th className="p-3 text-left">Weight</th>

              <th className="p-3 text-left">Volume</th>

              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  No UOMs found
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">{row.uom_name}</td>

                <td className="p-3">{row.is_base ? "Yes" : "No"}</td>

                <td className="p-3">{row.conversion_factor}</td>

                <td className="p-3">{row.barcode}</td>

                <td className="p-3">{row.weight}</td>

                <td className="p-3">{row.volume}</td>

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
      <p className="text-sm text-gray-500">Item ID: {itemId}</p>

      {/* MODAL */}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[600px] text-black rounded p-6 space-y-4">
            <h3 className="text-lg font-semibold">
              {editingId ? "Edit UOM Conversion" : "Add UOM Conversion"}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">UOM</label>

                <select
                  value={form.uom_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      uom_id: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                >
                  <option value="">Select UOM</option>

                  {uoms.map((uom) => (
                    <option key={uom.id} value={uom.id}>
                      {uom.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1">Conversion Factor</label>

                <input
                  value={form.conversion_factor}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      conversion_factor: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>

              <div>
                <label className="block mb-1">Barcode</label>

                <input
                  value={form.barcode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      barcode: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>

              <div>
                <label className="block mb-1">Weight</label>

                <input
                  value={form.weight}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      weight: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>

              <div>
                <label className="block mb-1">Volume</label>

                <input
                  value={form.volume}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      volume: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_base}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_base: e.target.checked,
                  })
                }
              />
              Base UOM
            </label>

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
}

/* "use client";

import { useEffect, useState } from "react";
import { ItemUOM, UOMForm, UOMOption } from "@/types/inventory";

type Props = {
  itemId: string;
};

const defaultForm: UOMForm = {
  uom_id: "",
  conversion_factor: "1",
  barcode: "",
  weight: "",
  volume: "",
  is_base: false,
};

export default function UOMTab({ itemId }: Props) {
  const [rows, setRows] = useState<ItemUOM[]>([]);
  const [uoms, setUoms] = useState<UOMOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<UOMForm>(defaultForm);

  const [editingId, setEditingId] =
  useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);

    try {
      const [uomRes, itemUomRes] = await Promise.all([
        fetch("/api/setup/inventory/uoms"),
        fetch(`/api/inventory/items/${itemId}/uoms`),
      ]);

      const uomData: UOMOption[] = await uomRes.json();

      const itemUomData: ItemUOM[] = await itemUomRes.json();

      setUoms(uomData);

      setRows(itemUomData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [itemId]);

  const handleSubmit = async () => {
    setSaving(true);

    try {
      await fetch(`/api/inventory/items/${itemId}/uoms`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(form),
      });

      setForm(defaultForm);
      setShowModal(false);

      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = confirm("Delete this UOM conversion?");

    if (!ok) {
      return;
    }

    try {
      await fetch(`/api/inventory/items/${itemId}/uoms/${id}`, {
        method: "DELETE",
      });

      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">UOM Conversions</h2>

        <button
          type="button"
          onClick={() => setShowModal(true)}
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

              <th className="p-3 text-left">Base</th>

              <th className="p-3 text-left">Conversion</th>

              <th className="p-3 text-left">Barcode</th>

              <th className="p-3 text-left">Weight</th>

              <th className="p-3 text-left">Volume</th>

              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  No UOMs found
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">{row.uom_name}</td>

                <td className="p-3">{row.is_base ? "Yes" : "No"}</td>

                <td className="p-3">{row.conversion_factor}</td>

                <td className="p-3">{row.barcode}</td>

                <td className="p-3">{row.weight}</td>

                <td className="p-3">{row.volume}</td>

                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>



      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[600px] text-black rounded p-6 space-y-4">
            <h3 className="text-lg font-semibold">Add UOM Conversion</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">UOM</label>

                <select
                  value={form.uom_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      uom_id: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                >
                  <option value="">Select UOM</option>

                  {uoms.map((uom) => (
                    <option key={uom.id} value={uom.id}>
                      {uom.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1">Conversion Factor</label>

                <input
                  value={form.conversion_factor}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      conversion_factor: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>

              <div>
                <label className="block mb-1">Barcode</label>

                <input
                  value={form.barcode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      barcode: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>

              <div>
                <label className="block mb-1">Weight</label>

                <input
                  value={form.weight}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      weight: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>

              <div>
                <label className="block mb-1">Volume</label>

                <input
                  value={form.volume}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      volume: e.target.value,
                    })
                  }
                  className="border p-2 w-full"
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_base}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_base: e.target.checked,
                  })
                }
              />
              Base UOM
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
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
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} */
