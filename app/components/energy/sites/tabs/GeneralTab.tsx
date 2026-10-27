// app/components/energy/sites/tabs/GeneralTab.tsx

"use client";

import NumericTextInput from "@/components/ui/NumericTextInput";
import { SitesFormData } from "@/types/sites";

type Props = {
  site: SitesFormData;
  setSiteRec: React.Dispatch<React.SetStateAction<SitesFormData>>;
  errors: Record<string, string>;
  isReadonly?: boolean;
};

export default function GeneralTab({
  site,
  setSiteRec,
  errors,
  isReadonly = false,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-2">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Site No.
            </label>
            <div className="col-span-2">
              <input
                type="text"
                disabled={isReadonly}
                value={site.site_no}
                onChange={(e) =>
                  setSiteRec((prev) => ({ ...prev, site_no: e.target.value }))
                }
                placeholder={"Enter site No."}
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Distribution Network Operator(DNO)
            </label>
            <div className="col-span-2">
              <input
                type="text"
                disabled={isReadonly}
                value={site.distributor_network_operator}
                onChange={(e) =>
                  setSiteRec((prev) => ({ ...prev, distributor_network_operator: e.target.value }))
                }
                placeholder={"Enter DNO"}
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
               Meter Point Administration Number(MPAN)
            </label>
            <div className="col-span-2">
              <input
                type="text"
                disabled={isReadonly}
                // value={site.mpan_no}
                onChange={(e) =>
                  setSiteRec((prev) => ({ ...prev, mpan_no: e.target.value }))
                }
                placeholder={"Enter MPAN Number"}
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
              />
            </div>
          </div>

          {/* export type SitesFormData = {
            id?: string;
            company_id?: string;
            site_no: string | null;
            distributor_network_operator: string | null;
            mpan_no: string | null;
            connection_size: string | null;
            connection_size_approved: string | null;
            bess_brand_model: string | null;
            bess_function_trading: string | null;
            segments?: string | null;
            gsp_uk: string | null;
            status: number;
            }; */}

          {/* <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Name <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <input
                type="text"
                disabled={isReadonly}
                value={site.name}
                onChange={(e) =>
                  setSiteRec((prev) => ({ ...prev, name: e.target.value }))
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
              <select
                disabled={isReadonly}
                value={site.category_id}
                onChange={(e) =>
                  setSiteRec((prev) => ({
                    ...prev,
                    category_id: e.target.value,
                  }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Brand
            </label>
            <div className="col-span-2">
              <select
                disabled={isReadonly}
                value={site.brand_id}
                onChange={(e) =>
                  setSiteRec((prev) => ({ ...prev, brand_id: e.target.value }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5"
              >
                <option value="">Select Brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              VAT Rate
            </label>
            <div className="col-span-2">
              <select
                disabled={isReadonly}
                value={site.vat_product_group_id || ""}
                onChange={(e) =>
                  setSiteRec((prev) => ({
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
          </div> */}
        </div>

        <div className="space-y-2">
          {/* <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Base Unit of Measure <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <select
                disabled={isReadonly}
                value={site.base_uom_id}
                onChange={(e) =>
                  setSiteRec((prev) => ({
                    ...prev,
                    base_uom_id: e.target.value,
                  }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5"
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
          </div> */}

          {/* <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Barcode
            </label>
            <div className="col-span-2">
              <input
                type="text"
                disabled={isReadonly}
                value={site.barcode}
                onChange={(e) =>
                  setSiteRec((prev) => ({ ...prev, barcode: e.target.value }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>
          </div> */}

          {/* <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Reorder Point Quantity
            </label>
            <div className="col-span-2">
              <NumericTextInput
                placeholder="0"
                min="0"
                disabled={isReadonly}
                value={Number(site.reorder_qty)}
                onChange={(val) =>
                  setSiteRec((prev) => ({ ...prev, reorder_qty: String(val) }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2.5 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Item Type
            </label>
            <div className="col-span-2">
              <select
                disabled={isReadonly}
                value={site.item_type}
                onChange={(e) =>
                  setSiteRec((prev) => ({
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
          </div> */}
        </div>
      </div>
    </div>
  );
}
