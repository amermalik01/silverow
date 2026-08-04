// app/components/inventory/items/tabs/GeneralTab.tsx

"use client";

import { ItemFormData, ItemLookupOption } from "@/types/inventory";

type Props = {
  item: ItemFormData;
  setItem: React.Dispatch<React.SetStateAction<ItemFormData>>;
  categories: ItemLookupOption[];
  brands: ItemLookupOption[];
  uoms: ItemLookupOption[];
  vatProductGroups?: ItemLookupOption[];
  autoCode: boolean;
  setAutoCode: (val: boolean) => void;
  errors: Record<string, string>;
  isReadonly?: boolean;
};

export default function GeneralTab({
  item,
  setItem,
  categories,
  brands,
  uoms,
  vatProductGroups = [],
  autoCode,
  setAutoCode,
  errors,
  isReadonly = false,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
      {/* Left Column */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              Item Code
            </label>
            {!isReadonly && (
              <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCode}
                  onChange={(e) => {
                    setAutoCode(e.target.checked);
                    if (e.target.checked)
                      setItem((prev) => ({ ...prev, item_code: "" }));
                  }}
                  className="rounded border-slate-300 text-blue-600"
                />
                Auto Generate
              </label>
            )}
          </div>
          <input
            type="text"
            disabled={autoCode || isReadonly}
            value={item.item_code}
            onChange={(e) =>
              setItem((prev) => ({ ...prev, item_code: e.target.value }))
            }
            placeholder={autoCode ? "Auto-generated" : "Enter item code"}
            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">
            Description / Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={isReadonly}
            value={item.name}
            onChange={(e) =>
              setItem((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
          />
          {errors["general.name"] && (
            <p className="text-red-500 text-[10px] mt-1">
              {errors["general.name"]}
            </p>
          )}
        </div>

        <div>
          <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">
            Category
          </label>
          <select
            disabled={isReadonly}
            value={item.category_id}
            onChange={(e) =>
              setItem((prev) => ({ ...prev, category_id: e.target.value }))
            }
            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">
            Brand
          </label>
          <select
            disabled={isReadonly}
            value={item.brand_id}
            onChange={(e) =>
              setItem((prev) => ({ ...prev, brand_id: e.target.value }))
            }
            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
          >
            <option value="">Select Brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">
            VAT Product Posting Group
          </label>
          <select
            disabled={isReadonly}
            value={item.vat_product_group_id || ""}
            onChange={(e) =>
              setItem((prev) => ({
                ...prev,
                vat_product_group_id: e.target.value,
              }))
            }
            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-white dark:bg-slate-900"
          >
            <option value="">Select VAT Group</option>
            {vatProductGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">
            Base Unit of Measure <span className="text-red-500">*</span>
          </label>
          <select
            disabled={isReadonly}
            value={item.base_uom_id}
            onChange={(e) =>
              setItem((prev) => ({ ...prev, base_uom_id: e.target.value }))
            }
            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
          >
            <option value="">Select UOM</option>
            {uoms.map((uom) => (
              <option key={uom.id} value={uom.id}>
                {uom.name}
              </option>
            ))}
          </select>
          {errors["general.base_uom_id"] && (
            <p className="text-red-500 text-[10px] mt-1">
              {errors["general.base_uom_id"]}
            </p>
          )}
        </div>

        <div>
          <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">
            Barcode
          </label>
          <input
            type="text"
            disabled={isReadonly}
            value={item.barcode}
            onChange={(e) =>
              setItem((prev) => ({ ...prev, barcode: e.target.value }))
            }
            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">
            Reorder Point Quantity
          </label>
          <input
            type="number"
            disabled={isReadonly}
            value={item.reorder_qty}
            onChange={(e) =>
              setItem((prev) => ({ ...prev, reorder_qty: e.target.value }))
            }
            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">
            Item Type
          </label>
          <select
            disabled={isReadonly}
            value={item.item_type}
            onChange={(e) =>
              setItem((prev) => ({
                ...prev,
                item_type: Number(e.target.value),
              }))
            }
            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
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
  );
}
