// app/components/inventory/items/tabs/PurchaseTab.tsx

"use client";

import { Icon } from "@iconify/react";

import NumericTextInput from "@/components/ui/NumericTextInput";
import {
  ItemFormData,
  ItemLookupOption,
  InventoryCostingMethod,
} from "@/types/inventory";
import {
  cardClass,
  errorTextClass,
  fieldInputClass,
  fieldLabelClass,
  fieldRowClass,
  getInputClass,
  pillClass,
  sectionHeaderClass,
  sectionIconClass,
} from "./itemStyles";

type Props = {
  item: ItemFormData;
  setItem: React.Dispatch<React.SetStateAction<ItemFormData>>;
  uoms: ItemLookupOption[];
  costingMethod: InventoryCostingMethod;
  isReadonly?: boolean;
};

const COSTING_METHOD_LABELS: Record<InventoryCostingMethod, string> = {
  FIFO: "First In, First Out (FIFO)",
  LIFO: "Last In, First Out (LIFO)",
  WEIGHTED_AVERAGE: "Weighted Average",
  STANDARD: "Standard Costing",
};

const money = (value: unknown) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function PurchaseTab({
  item,
  setItem,
  uoms,
  costingMethod,
  isReadonly = false,
}: Props) {
  const ro = isReadonly;
  const minQty = Number(item.min_purchase_qty ?? 1);
  const maxQty = Number(item.max_purchase_qty ?? 100);
  const qtyError = maxQty > 0 && minQty > maxQty;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Costing */}
        <section className={`${cardClass} lg:col-span-5 flex flex-col`}>
          <div className={sectionHeaderClass}>
            <Icon icon="tabler:calculator" className={sectionIconClass} />
            <span>Costing</span>
          </div>

          <div className="space-y-3">
            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Costing Method</label>
              <div className={fieldInputClass}>
                <input
                  type="text"
                  readOnly
                  value={COSTING_METHOD_LABELS[costingMethod]}
                  className={getInputClass(false, true)}
                />
              </div>
            </div>

            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Standard Cost</label>
              <div className={fieldInputClass}>
                <NumericTextInput
                  allowDecimals
                  decimalScale={2}
                  disabled
                  value={Number(item.standard_cost)}
                  onChange={(val) =>
                    setItem((prev) => ({ ...prev, standard_cost: String(val) }))
                  }
                  className={`${getInputClass(false, true)} tabular-nums`}
                />
              </div>
            </div>
          </div>

          <p className="mt-auto pt-4 flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Icon icon="tabler:info-circle" className="mt-px shrink-0 text-emerald-700" />
            The costing method is set company-wide in inventory posting setup.
            Standard cost is maintained by the costing process.
          </p>
        </section>

        {/* Purchase pricing */}
        <section className={`${cardClass} lg:col-span-7`}>
          <div className={`${sectionHeaderClass} justify-between`}>
            <span className="flex items-center gap-2">
              <Icon icon="tabler:shopping-cart" className={sectionIconClass} />
              Purchase Pricing
            </span>
            <span className={`${pillClass} tabular-nums`}>
              {money(item.standard_purchase_price)}
            </span>
          </div>

          <div className="space-y-3">
            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Purchase UOM</label>
              <div className={fieldInputClass}>
                <select
                  disabled={ro}
                  value={item.purchase_uom_id}
                  onChange={(e) =>
                    setItem((prev) => ({
                      ...prev,
                      purchase_uom_id: e.target.value,
                    }))
                  }
                  className={getInputClass(false, ro)}
                >
                  <option value="">Default Base UOM</option>
                  {uoms.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Purchase Price</label>
              <div className={fieldInputClass}>
                <NumericTextInput
                  allowDecimals
                  decimalScale={2}
                  disabled={ro}
                  value={Number(item.standard_purchase_price ?? 0)}
                  onChange={(val) =>
                    setItem((prev) => ({
                      ...prev,
                      standard_purchase_price: String(val),
                    }))
                  }
                  className={`${getInputClass(false, ro)} tabular-nums font-semibold`}
                />
              </div>
            </div>

            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Order Quantity</label>
              <div className={`${fieldInputClass} grid grid-cols-2 gap-2`}>
                <div>
                  <span className="mb-0.5 block text-[10px] text-slate-500">Min</span>
                  <NumericTextInput
                    disabled={ro}
                    value={minQty}
                    onChange={(val) =>
                      setItem((prev) => ({
                        ...prev,
                        min_purchase_qty: String(val),
                      }))
                    }
                    className={`${getInputClass(qtyError, ro)} tabular-nums`}
                  />
                </div>
                <div>
                  <span className="mb-0.5 block text-[10px] text-slate-500">Max</span>
                  <NumericTextInput
                    disabled={ro}
                    value={maxQty}
                    onChange={(val) =>
                      setItem((prev) => ({
                        ...prev,
                        max_purchase_qty: String(val),
                      }))
                    }
                    className={`${getInputClass(qtyError, ro)} tabular-nums`}
                  />
                </div>
              </div>
              {qtyError && (
                <p className={`col-span-8 col-start-5 ${errorTextClass}`}>
                  Minimum quantity is higher than the maximum.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
