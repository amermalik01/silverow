// app/components/inventory/items/tabs/GeneralTab.tsx

"use client";

import { Icon } from "@iconify/react";

import SelectWithAddModal from "@/app/components/common/SelectWithAddModal";
import NumericTextInput from "@/components/ui/NumericTextInput";
import { ItemFormData, ItemLookupOption } from "@/types/inventory";
import {
  cardClass,
  errorTextClass,
  fieldInputClass,
  fieldLabelClass,
  fieldRowClass,
  getInputClass,
  getSuffixWrapClass,
  pillClass,
  sectionHeaderClass,
  sectionIconClass,
  suffixInputClass,
  suffixUnitClass,
} from "./itemStyles";

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

const nameOf = (list: ItemLookupOption[], id?: string | null) =>
  list.find((x) => x.id === id)?.name || "—";

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
  effectiveReadonly = false,
}: Props) {
  const ro = effectiveReadonly;

  const volume =
    Number(item.height) > 0 && Number(item.width) > 0 && Number(item.length) > 0
      ? Number(item.height) * Number(item.width) * Number(item.length)
      : 0;

  const typeLabel = Number(item.item_type) === 2 ? "Service" : "Inventory";

  const suffixField = (
    key: "net_weight" | "gross_weight" | "height" | "width" | "length",
    unit: string,
    placeholder = "0",
  ) => (
    <div className={getSuffixWrapClass(ro)}>
      <NumericTextInput
        placeholder={placeholder}
        min="0"
        allowDecimals
        decimalScale={2}
        disabled={ro}
        value={Number(item[key])}
        onChange={(val) => setItem((prev) => ({ ...prev, [key]: String(val) }))}
        className={suffixInputClass}
      />
      <span className={suffixUnitClass}>{unit}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* 1. Item details */}
        <section className={`${cardClass} lg:col-span-7`}>
          <div className={`${sectionHeaderClass} justify-between`}>
            <span className="flex items-center gap-2">
              <Icon icon="tabler:box" className={sectionIconClass} />
              Item Details
            </span>
            <span className={pillClass}>{typeLabel}</span>
          </div>

          <div className="space-y-3">
            {/* Item code + auto */}
            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Item Code</label>
              <div className={`${fieldInputClass} flex items-center gap-2`}>
                <input
                  type="text"
                  disabled={autoCode || ro}
                  value={item.item_code}
                  onChange={(e) =>
                    setItem((prev) => ({ ...prev, item_code: e.target.value }))
                  }
                  placeholder={autoCode ? "Auto-generated" : "Enter item code"}
                  className={`${getInputClass(
                    Boolean(errors["general.item_code"]),
                    autoCode || ro,
                  )} font-mono`}
                />
                {!ro && (
                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={autoCode}
                      onChange={(e) => {
                        setAutoCode(e.target.checked);
                        if (e.target.checked)
                          setItem((prev) => ({ ...prev, item_code: "" }));
                      }}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                    />
                    Auto
                  </label>
                )}
              </div>
              {errors["general.item_code"] && (
                <p className={`col-span-8 col-start-5 ${errorTextClass}`}>
                  {errors["general.item_code"]}
                </p>
              )}
            </div>

            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Category</label>
              <div className={fieldInputClass}>
                <SelectWithAddModal
                  disabled={ro}
                  value={item.category_id}
                  onChange={(val) =>
                    setItem((prev) => ({ ...prev, category_id: val }))
                  }
                  items={categories}
                  placeholder="Select Category"
                  apiEndpoint="/api/setup/inventory/categories"
                  onItemAdded={(newCat) =>
                    setCategories((prev) => [...prev, newCat])
                  }
                  className={getInputClass(false, ro)}
                />
              </div>
            </div>

            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Brand</label>
              <div className={fieldInputClass}>
                <SelectWithAddModal
                  disabled={ro}
                  value={item.brand_id}
                  onChange={(val) =>
                    setItem((prev) => ({ ...prev, brand_id: val }))
                  }
                  items={brands}
                  placeholder="Select Brand"
                  apiEndpoint="/api/setup/inventory/brands"
                  onItemAdded={(newBrand) =>
                    setBrands((prev) => [...prev, newBrand])
                  }
                  className={getInputClass(false, ro)}
                />
              </div>
            </div>

            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Item Type</label>
              <div className={fieldInputClass}>
                <select
                  disabled={ro}
                  value={item.item_type}
                  onChange={(e) =>
                    setItem((prev) => ({
                      ...prev,
                      item_type: Number(e.target.value),
                    }))
                  }
                  className={getInputClass(false, ro)}
                >
                  <option value={1}>Inventory</option>
                  <option value={2}>Service</option>
                </select>
              </div>
            </div>

            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>VAT Rate</label>
              <div className={fieldInputClass}>
                <select
                  disabled={ro}
                  value={item.vat_product_group_id || ""}
                  onChange={(e) =>
                    setItem((prev) => ({
                      ...prev,
                      vat_product_group_id: e.target.value,
                    }))
                  }
                  className={getInputClass(false, ro)}
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
        </section>

        {/* 2. Units & stock */}
        <section className={`${cardClass} lg:col-span-5 flex flex-col`}>
          <div className={sectionHeaderClass}>
            <Icon icon="tabler:ruler-measure" className={sectionIconClass} />
            <span>Units &amp; Stock</span>
          </div>

          <div className="space-y-3">
            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>
                Base UOM <span className="text-red-500">*</span>
              </label>
              <div className={fieldInputClass}>
                <SelectWithAddModal
                  disabled={ro}
                  value={item.base_uom_id}
                  onChange={(val) =>
                    setItem((prev) => ({ ...prev, base_uom_id: val }))
                  }
                  items={uoms}
                  placeholder="Select UOM"
                  apiEndpoint="/api/setup/inventory/uoms"
                  onItemAdded={(newUom) => setUoms((prev) => [...prev, newUom])}
                  className={getInputClass(
                    Boolean(errors["general.base_uom_id"]),
                    ro,
                  )}
                />
                {errors["general.base_uom_id"] && (
                  <p className={errorTextClass}>
                    {errors["general.base_uom_id"]}
                  </p>
                )}
              </div>
            </div>

            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Reorder Point</label>
              <div className={fieldInputClass}>
                <NumericTextInput
                  placeholder="0"
                  min="0"
                  disabled={ro}
                  value={Number(item.reorder_qty)}
                  onChange={(val) =>
                    setItem((prev) => ({ ...prev, reorder_qty: String(val) }))
                  }
                  className={`${getInputClass(false, ro)} tabular-nums`}
                />
              </div>
            </div>
          </div>

          {/* Quick unit summary */}
          <div className="mt-auto pt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Base", value: nameOf(uoms, item.base_uom_id) },
              {
                label: "Purchase",
                value: nameOf(uoms, item.purchase_uom_id || item.base_uom_id),
              },
              {
                label: "Sales",
                value: nameOf(uoms, item.sales_uom_id || item.base_uom_id),
              },
            ].map((u) => (
              <div
                key={u.label}
                className="rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 px-2.5 py-2"
              >
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {u.label} UOM
                </p>
                <p className="truncate text-sm font-semibold text-black dark:text-slate-100">
                  {u.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 3. Weights & dimensions */}
      <section className={cardClass}>
        <div className={`${sectionHeaderClass} justify-between`}>
          <span className="flex items-center gap-2">
            <Icon icon="tabler:dimensions" className={sectionIconClass} />
            Weights &amp; Dimensions
          </span>
          {volume > 0 && (
            <span className={`${pillClass} tabular-nums`}>
              Volume {volume.toLocaleString(undefined, { maximumFractionDigits: 2 })} cm³
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-3">
          <div className="space-y-3">
            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Net Weight</label>
              <div className={fieldInputClass}>{suffixField("net_weight", "kg")}</div>
            </div>
            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Gross Weight</label>
              <div className={fieldInputClass}>{suffixField("gross_weight", "kg")}</div>
            </div>
          </div>

          <div className={`${fieldRowClass} self-start`}>
            <label className={fieldLabelClass}>
              Dimensions
              <span className="block text-[10px] font-normal text-slate-400">
                H × W × L
              </span>
            </label>
            <div className={`${fieldInputClass} grid grid-cols-3 gap-1.5`}>
              {suffixField("height", "cm", "H")}
              {suffixField("width", "cm", "W")}
              {suffixField("length", "cm", "L")}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
