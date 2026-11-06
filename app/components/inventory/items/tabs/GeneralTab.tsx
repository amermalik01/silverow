// app/components/inventory/items/tabs/GeneralTab.tsx

"use client";

import SelectWithAddModal from "@/app/components/common/SelectWithAddModal";
import NumericTextInput from "@/components/ui/NumericTextInput";
import { ItemFormData, ItemLookupOption } from "@/types/inventory";

type Props = {
  item: ItemFormData;
  setItem: React.Dispatch<React.SetStateAction<ItemFormData>>;
  categories: ItemLookupOption[];
  setCategories: React.Dispatch<React.SetStateAction<ItemLookupOption[]>>;
  brands: ItemLookupOption[];
  setBrands: React.Dispatch<React.SetStateAction<ItemLookupOption[]>>;
  uoms: ItemLookupOption[];
  setUoms: React.Dispatch<React.SetStateAction<ItemLookupOption[]>>;
  vatProductGroups?: ItemLookupOption[];
  autoCode: boolean;
  setAutoCode: (val: boolean) => void;
  errors: Record<string, string>;
  isReadonly?: boolean;
  effectiveReadonly?: boolean;
};

export default function GeneralTab({
  item,
  setItem,
  categories,
  setCategories,
  brands,
  setBrands,
  uoms,
  setUoms,
  vatProductGroups = [],
  autoCode,
  setAutoCode,
  errors,
  isReadonly = false,
  effectiveReadonly = false,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-2">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Item Code
            </label>
            <div className="col-span-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  disabled={autoCode || effectiveReadonly}
                  value={item.item_code}
                  onChange={(e) =>
                    setItem((prev) => ({ ...prev, item_code: e.target.value }))
                  }
                  placeholder={autoCode ? "Auto-generated" : "Enter item code"}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
                />
                {!effectiveReadonly && (
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
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Name <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <input
                type="text"
                disabled={effectiveReadonly}
                value={item.name}
                onChange={(e) =>
                  setItem((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
              {errors["general.name"] && (
                <p className="text-red-500 text-[10px] mt-1">
                  {errors["general.name"]}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Category
            </label>
            <div className="col-span-2">
              <SelectWithAddModal
                disabled={effectiveReadonly}
                value={item.category_id}
                onChange={(val) =>
                  setItem((prev) => ({ ...prev, category_id: val }))
                }
                items={categories}
                placeholder="Select Category"
                apiEndpoint="/api/setup/inventory/categories"
                additionalFields={[
                  { name: "code", label: "Category Code", type: "text" },
                ]}
                onItemAdded={(newCat) =>
                  setCategories((prev) => [...prev, newCat])
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 bg-white dark:bg-slate-900 text-xs"
              />
              {/* <select
                disabled={isReadonly}
                value={item.category_id}
                onChange={(e) =>
                  setItem((prev) => ({ ...prev, category_id: e.target.value }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select> */}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Brand
            </label>
            <div className="col-span-2">
              {/* <select
                disabled={isReadonly}
                value={item.brand_id}
                onChange={(e) =>
                  setItem((prev) => ({ ...prev, brand_id: e.target.value }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5"
              >
                <option value="">Select Brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select> */}

              <SelectWithAddModal
                disabled={effectiveReadonly}
                value={item.brand_id}
                onChange={(val) =>
                  setItem((prev) => ({ ...prev, brand_id: val }))
                }
                items={brands}
                placeholder="Select Brand"
                apiEndpoint="/api/setup/inventory/brands"
                additionalFields={[
                  { name: "code", label: "Brand Code", type: "text" },
                ]}
                onItemAdded={(newBrand) =>
                  setBrands((prev) => [...prev, newBrand])
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 bg-white dark:bg-slate-900 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Item Type
            </label>
            <div className="col-span-2">
              <select
                disabled={effectiveReadonly}
                value={item.item_type}
                onChange={(e) =>
                  setItem((prev) => ({
                    ...prev,
                    item_type: Number(e.target.value),
                  }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5"
              >
                <option value={1}>Inventory</option>
                <option value={2}>Service</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {/* VAT Product Posting Group */}VAT Rate
            </label>
            <div className="col-span-2">
              <select
                disabled={effectiveReadonly}
                value={item.vat_product_group_id || ""}
                onChange={(e) =>
                  setItem((prev) => ({
                    ...prev,
                    vat_product_group_id: e.target.value,
                  }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 bg-white dark:bg-slate-900"
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
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Base Unit of Measure <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              {/* <select
                disabled={isReadonly}
                value={item.base_uom_id}
                onChange={(e) =>
                  setItem((prev) => ({ ...prev, base_uom_id: e.target.value }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5"
              >
                <option value="">Select UOM</option>
                {uoms.map((uom) => (
                  <option key={uom.id} value={uom.id}>
                    {uom.name}
                  </option>
                ))}
              </select> */}

              <SelectWithAddModal
                disabled={effectiveReadonly}
                value={item.base_uom_id}
                onChange={(val) =>
                  setItem((prev) => ({ ...prev, base_uom_id: val }))
                }
                items={uoms}
                placeholder="Select UOM"
                apiEndpoint="/api/setup/inventory/uoms"
                additionalFields={[
                  {
                    name: "code",
                    label: "UOM Code (e.g., PCS, KG)",
                    type: "text",
                  },
                ]}
                onItemAdded={(newUom) => setUoms((prev) => [...prev, newUom])}
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 bg-white dark:bg-slate-900 text-xs"
              />
              {errors["general.base_uom_id"] && (
                <p className="text-red-500 text-[10px] mt-1">
                  {errors["general.base_uom_id"]}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Reorder Point Quantity
            </label>
            <div className="col-span-2">
              <NumericTextInput
                placeholder="0"
                min="0"
                disabled={effectiveReadonly}
                value={Number(item.reorder_qty)}
                onChange={(val) =>
                  setItem((prev) => ({ ...prev, reorder_qty: String(val) }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Net Weight
            </label>

            <div className="col-span-2 flex items-center border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden">
              <NumericTextInput
                placeholder="0"
                min="0"
                allowDecimals
                decimalScale={2}
                disabled={effectiveReadonly}
                value={Number(item.net_weight)}
                onChange={(val) =>
                  setItem((prev) => ({ ...prev, net_weight: String(val) }))
                }
                className="w-full p-2.5 border-none focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed bg-transparent"
              />
              <span className="px-3 text-slate-500 dark:text-slate-400 text-xs font-medium border-l border-slate-200 dark:border-slate-800 self-stretch flex items-center">
                kg
              </span>
            </div>
            {/* <div className="col-span-2">
              <NumericTextInput
                placeholder="0"
                min="0"
                allowDecimals
                decimalScale={2}
                disabled={effectiveReadonly}
                value={Number(item.net_weight)}
                onChange={(val) =>
                  setItem((prev) => ({ ...prev, net_weight: String(val) }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div> */}
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Gross Weight
            </label>
            <div className="col-span-2 flex items-center border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden">
              <NumericTextInput
                placeholder="0"
                min="0"
                allowDecimals
                decimalScale={2}
                disabled={effectiveReadonly}
                value={Number(item.gross_weight)}
                onChange={(val) =>
                  setItem((prev) => ({ ...prev, gross_weight: String(val) }))
                }
                className="w-full p-2.5 border-none focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed bg-transparent"
              />
              <span className="px-3 text-slate-500 dark:text-slate-400 text-xs font-medium border-l border-slate-200 dark:border-slate-800 self-stretch flex items-center">
                kg
              </span>
            </div>
          </div>


          {/* Dimensions (Height, Width, Length in a single row) */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Dimensions (H × W × L)
            </label>
            <div className="col-span-2 grid grid-cols-3 gap-1.5">
              {/* Height */}
              <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden">
                <NumericTextInput
                  placeholder="H"
                  min="0"
                  allowDecimals
                  decimalScale={2}
                  disabled={effectiveReadonly}
                  value={Number(item.height)}
                  onChange={(val) =>
                    setItem((prev) => ({ ...prev, height: String(val) }))
                  }
                  className="w-full p-2.5 text-xs border-none focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed bg-transparent"
                />
                <span className="px-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-medium border-l border-slate-200 dark:border-slate-800 self-stretch flex items-center">
                  cm
                </span>
              </div>

              {/* Width */}
              <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden">
                <NumericTextInput
                  placeholder="W"
                  min="0"
                  allowDecimals
                  decimalScale={2}
                  disabled={effectiveReadonly}
                  value={Number(item.width)}
                  onChange={(val) =>
                    setItem((prev) => ({ ...prev, width: String(val) }))
                  }
                  className="w-full p-2.5 text-xs border-none focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed bg-transparent"
                />
                <span className="px-1.5  text-slate-500 dark:text-slate-400 text-[10px] font-medium border-l border-slate-200 dark:border-slate-800 self-stretch flex items-center">
                  cm
                </span>
              </div>

              {/* Length */}
              <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden">
                <NumericTextInput
                  placeholder="L"
                  min="0"
                  allowDecimals
                  decimalScale={2}
                  disabled={effectiveReadonly}
                  value={Number(item.length)}
                  onChange={(val) =>
                    setItem((prev) => ({ ...prev, length: String(val) }))
                  }
                  className="w-full p-2.5 text-xs border-none focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed bg-transparent"
                />
                <span className="px-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-medium border-l border-slate-200 dark:border-slate-800 self-stretch flex items-center">
                  cm
                </span>
              </div>
            </div>
          </div>

          
        </div>
      </div>
    </div>
  );
}

{
  /* <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Barcode
            </label>
            <div className="col-span-2">
              <input
                type="text"
                disabled={isReadonly}
                value={item.barcode}
                onChange={(e) =>
                  setItem((prev) => ({ ...prev, barcode: e.target.value }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>
          </div> */
}
{
  /* <option value={3}>Non Inventory</option>
                <option value={4}>Raw Material</option>
                <option value={5}>Finished Goods</option>
                <option value={6}>Asset</option> */
}
