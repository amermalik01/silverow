// app/components/inventory/items/ItemForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemFormData, ItemLookupOption } from "@/types/inventory";

type Props = {
  id?: string;
};

const defaultForm: ItemFormData = {
  item_code: "",
  barcode: "",

  name: "",
  description: "",

  item_type: 1,
  status: 1,

  category_id: "",
  brand_id: "",

  base_uom_id: "",

  purchase_uom_id: "",
  sales_uom_id: "",

  stock_tracking: true,

  reorder_qty: "",

  standard_sales_price: "",

  standard_cost: "",

  costing_method: 1,
};

export default function ItemForm({ id }: Props) {
  const router = useRouter();

  const [form, setForm] = useState<ItemFormData>(defaultForm);

  const [loading, setLoading] = useState<boolean>(false);

  const [categories, setCategories] = useState<ItemLookupOption[]>([]);

  const [brands, setBrands] = useState<ItemLookupOption[]>([]);

  const [uoms, setUoms] = useState<ItemLookupOption[]>([]);

  const [autoCode, setAutoCode] = useState<boolean>(true);

  useEffect(() => {
    loadLookups();

    const loadItem = async () => {
      try {
        const res = await fetch(`/api/inventory/items/${id}`);

        if (!res.ok) {
          throw new Error("Failed to load item");
        }

        const result = await res.json();

        setForm({
          item_code: result.item_code || "",

          barcode: result.barcode || "",

          name: result.name || "",

          description: result.description || "",

          item_type: result.item_type || 1,

          status: result.status || 1,

          category_id: result.category_id || "",

          brand_id: result.brand_id || "",

          base_uom_id: result.base_uom_id || "",

          purchase_uom_id: result.purchase_uom_id || "",

          sales_uom_id: result.sales_uom_id || "",

          stock_tracking: result.stock_tracking ?? true,

          reorder_qty: result.reorder_qty?.toString() || "",

          standard_sales_price: result.standard_sales_price?.toString() || "",

          standard_cost: result.standard_cost?.toString() || "",

          costing_method: result.costing_method || 1,
        });
      } catch (err) {
        console.error(err);
      }
    };

    if (id) {
      loadItem();
    }
  }, [id]);

  const loadLookups = async () => {
    try {
      const [categoryRes, brandRes, uomRes] = await Promise.all([
        fetch("/api/setup/inventory/categories"),

        fetch("/api/setup/inventory/brands"),

        fetch("/api/setup/inventory/uoms"),
      ]);

      const categoryData = await categoryRes.json();

      const brandData = await brandRes.json();

      const uomData = await uomRes.json();

      setCategories(categoryData);

      setBrands(brandData);

      setUoms(uomData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
        ...form,
        item_code: autoCode ? "" : form.item_code,

        category_id: form.category_id || null,

        brand_id: form.brand_id || null,

        purchase_uom_id: form.purchase_uom_id || null,

        sales_uom_id: form.sales_uom_id || null,

        reorder_qty: form.reorder_qty || null,

        standard_sales_price: form.standard_sales_price || null,

        standard_cost: form.standard_cost || null,
      };

      const res = await fetch("/api/inventory/items", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to create item");
      }

      router.push("/inventory/items");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Item</h1>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          {loading ? "Saving..." : "Save Item"}
        </button>
      </div>

      {/* GENERAL */}
      <div className="border rounded p-4 space-y-4">
        <h2 className="font-semibold text-lg">General</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* <div>
            <label className="block mb-1">Item Code</label>

            <input
              value={form.item_code}
              onChange={(e) =>
                setForm({
                  ...form,
                  item_code: e.target.value,
                })
              }
              className="border p-2 w-full"
              required
            />
          </div> */}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block">Item Code</label>

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={autoCode}
                  onChange={(e) => {
                    setAutoCode(e.target.checked);

                    if (e.target.checked) {
                      setForm({
                        ...form,
                        item_code: "",
                      });
                    }
                  }}
                />
                Auto Generate
              </label>
            </div>

            <input
              value={form.item_code}
              disabled={autoCode}
              onChange={(e) =>
                setForm({
                  ...form,
                  item_code: e.target.value,
                })
              }
              placeholder={
                autoCode ? "Will be auto generated" : "Enter item code"
              }
              className="border p-2 w-full disabled:bg-blue-600 disabled:text-white"
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

          <div className="col-span-2">
            <label className="block mb-1">Name</label>

            <input
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              className="border p-2 w-full"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block mb-1">Description</label>

            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              className="border p-2 w-full"
            />
          </div>

          <div>
            <label className="block mb-1">Category</label>

            <select
              value={form.category_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  category_id: e.target.value,
                })
              }
              className="border p-2 w-full"
            >
              <option value="">Select</option>

              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1">Brand</label>

            <select
              value={form.brand_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  brand_id: e.target.value,
                })
              }
              className="border p-2 w-full"
            >
              <option value="">Select</option>

              {brands.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1">Base UOM</label>

            <select
              value={form.base_uom_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  base_uom_id: e.target.value,
                })
              }
              className="border p-2 w-full"
              required
            >
              <option value="">Select</option>

              {uoms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1">Item Type</label>

            <select
              value={form.item_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  item_type: Number(e.target.value),
                })
              }
              className="border p-2 w-full"
            >
              <option value={1}>Inventory</option>

              <option value={2}>Service</option>

              <option value={3}>Non Inventory</option>

              <option value={4}>Raw Material</option>

              <option value={5}>Finished Goods</option>

              <option value={6}>Asset</option>
            </select>
          </div>
        </div>
      </div>

      {/* INVENTORY */}
      <div className="border rounded p-4 space-y-4">
        <h2 className="font-semibold text-lg">Inventory</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block mb-1">Reorder Qty</label>

            <input
              type="number"
              value={form.reorder_qty}
              onChange={(e) =>
                setForm({
                  ...form,
                  reorder_qty: e.target.value,
                })
              }
              className="border p-2 w-full"
            />
          </div>

          <div>
            <label className="block mb-1">Standard Cost</label>

            <input
              type="number"
              value={form.standard_cost}
              onChange={(e) =>
                setForm({
                  ...form,
                  standard_cost: e.target.value,
                })
              }
              className="border p-2 w-full"
            />
          </div>

          <div>
            <label className="block mb-1">Costing Method</label>

            <select
              value={form.costing_method}
              onChange={(e) =>
                setForm({
                  ...form,
                  costing_method: Number(e.target.value),
                })
              }
              className="border p-2 w-full"
            >
              <option value={1}>FIFO</option>

              <option value={2}>Average</option>

              <option value={3}>Standard</option>
            </select>
          </div>
        </div>
      </div>

      {/* SALES */}
      <div className="border rounded p-4 space-y-4">
        <h2 className="font-semibold text-lg">Sales</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Sales Price</label>

            <input
              type="number"
              value={form.standard_sales_price}
              onChange={(e) =>
                setForm({
                  ...form,
                  standard_sales_price: e.target.value,
                })
              }
              className="border p-2 w-full"
            />
          </div>

          <div>
            <label className="block mb-1">Sales UOM</label>

            <select
              value={form.sales_uom_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  sales_uom_id: e.target.value,
                })
              }
              className="border p-2 w-full"
            >
              <option value="">Select</option>

              {uoms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PURCHASE */}
      <div className="border rounded p-4 space-y-4">
        <h2 className="font-semibold text-lg">Purchase</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Purchase UOM</label>

            <select
              value={form.purchase_uom_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  purchase_uom_id: e.target.value,
                })
              }
              className="border p-2 w-full"
            >
              <option value="">Select</option>

              {uoms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </form>
  );
}
