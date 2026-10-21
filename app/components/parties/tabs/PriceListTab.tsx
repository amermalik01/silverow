// app/components/parties/tabs/PriceListTab.tsx

"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import MasterDropdown from "@/app/components/common/MasterDropdown";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
// import { format, parseISO, startOfDay } from "date-fns";
import { format, parse, parseISO, isValid } from "date-fns";

import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";
import SalespersonLookupModal, {
  Employee,
} from "@/app/components/shared/modals/SalespersonLookupModal";

export type VolumeDiscountDraft = {
  id?: string;
  min_order_qty: number | string;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT";
  discount_value: number | string;
  discounted_price: number | string;
};

export type PriceListItemDraft = {
  id?: string;
  item_id: string;
  item_code: string;
  name: string;
  category_name?: string;
  uom_id: string;
  uom_name?: string;
  standard_price: number | string;
  offered_price: number | string;
  min_order_qty: number | string;
  max_order_qty: number | string;
  has_volume_discount: boolean;
  volume_discounts: VolumeDiscountDraft[];
};

export type PriceListDraft = {
  id?: string;
  party_id?: string;
  name: string;
  list_type: "SALES" | "PURCHASE";
  start_date: string;
  end_date: string;
  currency_id: string;
  offer_method: string;
  salesperson_id?: string;
  salesperson_name?: string;
  items: PriceListItemDraft[];
};

type Props = {
  partyId: string;
  partyType: "customer" | "supplier";
  baseCurrencyId?: string;
  priceLists: PriceListDraft[];
  setPriceLists: React.Dispatch<React.SetStateAction<PriceListDraft[]>>;
  isReadonly?: boolean;
  errors: Record<string, string>;
  onRequestEdit?: () => void;
};

function parseStoredDate(value?: string): Date | undefined {
  if (!value) return undefined;

  let date: Date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date = parseISO(value);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    date = parse(value, "dd/MM/yyyy", new Date());
  } else {
    date = parseISO(value);
  }

  return isValid(date) ? date : undefined;
}

export default function PriceListTab({
  partyId,
  partyType,
  baseCurrencyId,
  priceLists,
  setPriceLists,
  isReadonly = false,
  errors,
  onRequestEdit,
}: Props) {
  const [selectedListIdx, setSelectedListIdx] = useState<number>(0);
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSalespersonModalOpen, setIsSalespersonModalOpen] = useState(false);

  const activeList = priceLists[selectedListIdx] || null;

  // Enforce fixed list type based on party type
  const enforcedListType = partyType === "supplier" ? "PURCHASE" : "SALES";

  //   const [startDate, setStartDate] = useState<Date | undefined>();
  //   const [endDate, setEndDate] = useState<Date | undefined>(
  //     startOfDay(new Date()),
  //   );

  const startDate = parseStoredDate(activeList?.start_date);
  const endDate = parseStoredDate(activeList?.end_date);

  const addPriceList = () => {
    onRequestEdit?.();

    const today = new Date();

    const newList: PriceListDraft = {
      party_id: partyId,
      name:
        partyType === "supplier"
          ? "Supplier Purchase Price List"
          : "Customer Sales Price List",
      list_type: enforcedListType,
      start_date: format(today, "yyyy-MM-dd"),
      end_date: format(
        new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()),
        "yyyy-MM-dd",
      ),
      //   start_date: new Date().toISOString().split("T")[0],
      //   end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      //     .toISOString()
      //     .split("T")[0],
      currency_id: baseCurrencyId || "",
      offer_method: "Fixed Price",
      items: [],
    };
    setPriceLists([...priceLists, newList]);
    setSelectedListIdx(priceLists.length);
    setActiveItemIdx(null);
  };

  const updateActiveListHeader = (
    key: keyof PriceListDraft,
    val: string | boolean,
  ) => {
    onRequestEdit?.();
    setPriceLists(
      priceLists.map((list, idx) =>
        idx === selectedListIdx ? { ...list, [key]: val } : list,
      ),
    );
  };

  const handleMultipleItemSelect = async (items: ItemLookupRecord[]) => {
    if (!items.length || !activeList) {
      setIsItemModalOpen(false);
      return;
    }

    onRequestEdit?.();
    const newItems: PriceListItemDraft[] = items.map((item) => ({
      item_id: item.id,
      item_code: item.item_code || "",
      name: item.name || "",
      category_name: "",
      uom_id: item.base_uom_id || "",
      uom_name: item.base_uom_name || "",
      standard_price: item.standard_sales_price || item.standard_cost || 0,
      offered_price: item.standard_sales_price || item.standard_cost || 0,
      min_order_qty: 1,
      max_order_qty: 100,
      has_volume_discount: false,
      volume_discounts: [],
    }));

    const updatedItems = [...activeList.items, ...newItems];
    setPriceLists(
      priceLists.map((list, idx) =>
        idx === selectedListIdx ? { ...list, items: updatedItems } : list,
      ),
    );
    setIsItemModalOpen(false);
  };

  const updateItemRow = (
    itemIdx: number,
    key: keyof PriceListItemDraft,
    val: unknown,
  ) => {
    onRequestEdit?.();
    if (!activeList) return;
    const updatedItems = activeList.items.map((item, idx) => {
      if (idx === itemIdx) {
        return { ...item, [key]: val };
      }
      return item;
    });

    setPriceLists(
      priceLists.map((list, idx) =>
        idx === selectedListIdx ? { ...list, items: updatedItems } : list,
      ),
    );
  };

  const removeItemRow = (itemIdx: number) => {
    onRequestEdit?.();
    if (!activeList) return;
    const updatedItems = activeList.items.filter((_, idx) => idx !== itemIdx);
    setPriceLists(
      priceLists.map((list, idx) =>
        idx === selectedListIdx ? { ...list, items: updatedItems } : list,
      ),
    );
    if (activeItemIdx === itemIdx) setActiveItemIdx(null);
  };

  const addVolumeDiscountRow = (itemIdx: number) => {
    onRequestEdit?.();
    if (!activeList) return;
    const updatedItems = activeList.items.map((item, idx) => {
      if (idx === itemIdx) {
        const newTier: VolumeDiscountDraft = {
          min_order_qty: 5,
          discount_type: "PERCENTAGE",
          discount_value: 5,
          discounted_price: 0,
        };
        return {
          ...item,
          has_volume_discount: true,
          volume_discounts: [...item.volume_discounts, newTier],
        };
      }
      return item;
    });

    setPriceLists(
      priceLists.map((list, idx) =>
        idx === selectedListIdx ? { ...list, items: updatedItems } : list,
      ),
    );
  };

  const updateVolumeDiscountRow = (
    itemIdx: number,
    tierIdx: number,
    key: keyof VolumeDiscountDraft,
    val: unknown,
  ) => {
    onRequestEdit?.();
    if (!activeList) return;
    const updatedItems = activeList.items.map((item, idx) => {
      if (idx === itemIdx) {
        const updatedTiers = item.volume_discounts.map((tier, tIdx) => {
          if (tIdx === tierIdx) {
            return { ...tier, [key]: val };
          }
          return tier;
        });
        return { ...item, volume_discounts: updatedTiers };
      }
      return item;
    });

    setPriceLists(
      priceLists.map((list, idx) =>
        idx === selectedListIdx ? { ...list, items: updatedItems } : list,
      ),
    );
  };

  const removeVolumeDiscountRow = (itemIdx: number, tierIdx: number) => {
    onRequestEdit?.();
    if (!activeList) return;
    const updatedItems = activeList.items.map((item, idx) => {
      if (idx === itemIdx) {
        const updatedTiers = item.volume_discounts.filter(
          (_, tIdx) => tIdx !== tierIdx,
        );
        return {
          ...item,
          volume_discounts: updatedTiers,
          has_volume_discount: updatedTiers.length > 0,
        };
      }
      return item;
    });

    setPriceLists(
      priceLists.map((list, idx) =>
        idx === selectedListIdx ? { ...list, items: updatedItems } : list,
      ),
    );
  };

  const getInputClass = (
    errorKey: string,
    extraClasses: string = "",
    disabled: boolean = isReadonly,
  ) => {
    const baseClasses =
      "w-full border p-2 rounded text-xs outline-none transition-colors duration-150";
    if (disabled) {
      return `${baseClasses} bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none ${extraClasses}`;
    }
    const stateClasses = errors[errorKey]
      ? "border-red-500 bg-red-50/10 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
    return `${baseClasses} ${stateClasses} ${extraClasses}`;
  };

  return (
    <div className="space-y-4">
      {/* Sub-Tabs / Header Selection Bar */}
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {priceLists.map((list, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedListIdx(idx);
                setActiveItemIdx(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t transition-colors ${
                selectedListIdx === idx
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {list.name || `Price List ${idx + 1}`}
            </button>
          ))}
        </div>
        {!isReadonly && (
          <Button type="button" onClick={addPriceList} variant="add_line">
            Add Price List
          </Button>
        )}
      </div>

      {priceLists.length === 0 || !activeList ? (
        <div className="p-8 text-center text-xs border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400">
          No price lists assigned to this profile.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Price List Meta Card with structured grid matching Contacts layout */}
          <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-3">
              {/* Name */}
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Name <span className="text-red-500">*</span>
                </label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={activeList.name}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateActiveListHeader("name", e.target.value)
                    }
                    className={getInputClass(
                      `priceLists.${selectedListIdx}.name`,
                    )}
                  />
                </div>
              </div>

              {/* Offer Method */}
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Offer Method
                </label>
                <div className="col-span-2">
                  <select
                    value={activeList.offer_method}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateActiveListHeader("offer_method", e.target.value)
                    }
                    className={getInputClass(
                      `priceLists.${selectedListIdx}.offer_method`,
                    )}
                  >
                    <option value="Fixed Price">Fixed Price</option>
                    <option value="Percentage Discount">
                      Percentage Discount
                    </option>
                  </select>
                </div>
              </div>

              {/* Start Date */}
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <div className="col-span-2">
                  <DatePicker
                    value={startDate}
                    containerClassName="col-span-8"
                    disabled={isReadonly}
                    minDate={new Date()}
                    maxDate={endDate}
                    onChange={(date: Date | undefined) => {
                      if (date && isValid(date)) {
                        updateActiveListHeader(
                          "start_date",
                          format(date, "yyyy-MM-dd"),
                        );
                      }
                    }}
                    className={getInputClass(
                      `priceLists.${selectedListIdx}.start_date`,
                    )}
                  />
                  {/* <DatePicker
                    value={
                      activeList.start_date
                        ? parseISO(activeList.start_date)
                        : undefined
                    }
                    containerClassName="col-span-8"
                    disabled={isReadonly}
                    minDate={new Date()}
                    maxDate={endDate}
                    onChange={(date: Date | undefined) => {
                      if (date) {
                        updateActiveListHeader(
                          "start_date",
                          format(date, "dd/MM/yyyy"),
                        );
                      }
                    }}
                    className={getInputClass(
                      `priceLists.${selectedListIdx}.start_date`,
                    )}
                  /> */}
                </div>
              </div>

              {/* End Date */}
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  End Date <span className="text-red-500">*</span>
                </label>
                <div className="col-span-2">
                  <DatePicker
                    value={endDate}
                    containerClassName="col-span-8"
                    disabled={isReadonly}
                    minDate={startDate}
                    onChange={(date: Date | undefined) => {
                      if (date && isValid(date)) {
                        updateActiveListHeader(
                          "end_date",
                          format(date, "yyyy-MM-dd"),
                        );
                      }
                    }}
                    className={getInputClass(
                      `priceLists.${selectedListIdx}.end_date`,
                    )}
                  />
                  {/* <DatePicker
                    value={
                      activeList.end_date
                        ? parseISO(activeList.end_date)
                        : undefined
                    }
                    containerClassName="col-span-8"
                    disabled={isReadonly}
                    minDate={startDate}
                    onChange={(date: Date | undefined) => {
                      if (date) {
                        updateActiveListHeader(
                          "end_date",
                          format(date, "dd/MM/yyyy"),
                        );
                      }
                    }}
                    className={getInputClass(
                      `priceLists.${selectedListIdx}.end_date`,
                    )}
                  /> */}
                </div>
              </div>

              {/* Currency (Locked & Disabled to Base Currency) */}
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Currency <span className="text-red-500">*</span>
                </label>
                <div className="col-span-2">
                  <MasterDropdown
                    type="Currency"
                    value={activeList.currency_id || baseCurrencyId}
                    displayFormat="name"
                    valueKey="id"
                    onChange={(val) =>
                      updateActiveListHeader("currency_id", val ?? "")
                    }
                    disabled={true} // Locked to party base currency
                  />
                </div>
              </div>

              {/* List Type (Locked & Disabled based on partyType) */}
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  List Type
                </label>
                <div className="col-span-2">
                  <select
                    value={enforcedListType}
                    disabled={true} // Locked based on customer/supplier card type
                    className={getInputClass(
                      `priceLists.${selectedListIdx}.list_type`,
                      "",
                      true,
                    )}
                  >
                    <option value="SALES">Sales Price List</option>
                    <option value="PURCHASE">Purchase Price List</option>
                  </select>
                </div>
              </div>

              {/* Salesperson Selection via Modal */}

              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {partyType === "customer"
                    ? "Salesperson"
                    : partyType === "supplier"
                      ? "Purchaser"
                      : "Assign Person"}
                </label>
                <div className="col-span-2 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    value={activeList.salesperson_name || "Select Person..."}
                    placeholder="Select salesperson..."
                    className={getInputClass(
                      `priceLists.${selectedListIdx}.salesperson_id`,
                    )}
                  />

                  {!isReadonly && (
                    <button
                      type="button"
                      disabled={isReadonly}
                      onClick={() => setIsSalespersonModalOpen(true)}
                      className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                    >
                      <Icon icon="tabler:external-link" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Items Matrix Grid */}
          <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Attached Items & Pricing Offers
              </h4>
              {!isReadonly && (
                <Button
                  type="button"
                  onClick={() => setIsItemModalOpen(true)}
                  variant="add_line"
                >
                  + Add Item
                </Button>
              )}
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold bg-slate-50/50 dark:bg-slate-800/20">
                  <th className="p-3">Item No.</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">U.O.M</th>
                  <th className="p-3">Standard Price</th>
                  <th className="p-3">Price Offer</th>
                  <th className="p-3">Min Qty</th>
                  <th className="p-3">Max Qty</th>
                  <th className="p-3 text-center">Volume Discount</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeList.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-6 text-center text-slate-400 italic"
                    >
                      No items added to this price list yet. Click &quot;+ Add
                      Item&quot; to select items via lookup.
                    </td>
                  </tr>
                ) : (
                  activeList.items.map((item, itemIdx) => (
                    <tr
                      key={itemIdx}
                      onClick={() => setActiveItemIdx(itemIdx)}
                      className={`border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors ${
                        activeItemIdx === itemIdx
                          ? "bg-blue-50/40 dark:bg-blue-900/10"
                          : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      <td className="p-3 font-medium">{item.item_code}</td>
                      <td className="p-3">{item.name}</td>
                      <td className="p-3 text-slate-500">
                        {item.category_name || "Spare Parts"}
                      </td>
                      <td className="p-3">{item.uom_name || "Pcs"}</td>
                      <td className="p-3">{item.standard_price}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={item.offered_price}
                          disabled={isReadonly}
                          onChange={(e) =>
                            updateItemRow(
                              itemIdx,
                              "offered_price",
                              e.target.value,
                            )
                          }
                          className="w-24 border rounded p-1 text-xs bg-blue-50 font-semibold"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={item.min_order_qty}
                          disabled={isReadonly}
                          onChange={(e) =>
                            updateItemRow(
                              itemIdx,
                              "min_order_qty",
                              e.target.value,
                            )
                          }
                          className="w-16 border rounded p-1 text-xs bg-transparent"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={item.max_order_qty}
                          disabled={isReadonly}
                          onChange={(e) =>
                            updateItemRow(
                              itemIdx,
                              "max_order_qty",
                              e.target.value,
                            )
                          }
                          className="w-16 border rounded p-1 text-xs bg-transparent"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.has_volume_discount}
                          onChange={(e) => {
                            updateItemRow(
                              itemIdx,
                              "has_volume_discount",
                              e.target.checked,
                            );
                            if (
                              e.target.checked &&
                              item.volume_discounts.length === 0
                            ) {
                              addVolumeDiscountRow(itemIdx);
                            }
                          }}
                          disabled={isReadonly}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                      </td>
                      <td className="p-3 text-right">
                        {!isReadonly && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItemRow(itemIdx);
                            }}
                            className="text-slate-400 hover:text-red-600 px-2 py-1 font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Volume Discount Sub-Matrix */}
          {activeItemIdx !== null && activeList.items[activeItemIdx] && (
            <div className="p-4 rounded border border-blue-200 dark:border-blue-900 bg-blue-50/20 dark:bg-slate-900 space-y-3">
              <div className="flex justify-between items-center">
                <h5 className="text-xs font-bold text-blue-800 dark:text-blue-300">
                  Volume Discount Tiers for{" "}
                  {activeList.items[activeItemIdx].name || "Selected Item"} (
                  {activeList.items[activeItemIdx].item_code || "SKU"})
                </h5>
                {!isReadonly && (
                  <Button
                    type="button"
                    onClick={() => addVolumeDiscountRow(activeItemIdx)}
                    variant="add_line"
                  >
                    + Add Tier
                  </Button>
                )}
              </div>

              <table className="w-full text-left border-collapse text-xs bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                    <th className="p-2.5">Min Order Qty</th>
                    <th className="p-2.5">Discount Type</th>
                    <th className="p-2.5">Discount By</th>
                    <th className="p-2.5">Discounted Price</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.items[activeItemIdx].volume_discounts.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-4 text-center text-slate-400 italic"
                      >
                        No volume discount tiers specified.
                      </td>
                    </tr>
                  ) : (
                    activeList.items[activeItemIdx].volume_discounts.map(
                      (tier, tierIdx) => (
                        <tr
                          key={tierIdx}
                          className="border-b border-slate-100 dark:border-slate-800"
                        >
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={tier.min_order_qty}
                              disabled={isReadonly}
                              onChange={(e) =>
                                updateVolumeDiscountRow(
                                  activeItemIdx,
                                  tierIdx,
                                  "min_order_qty",
                                  e.target.value,
                                )
                              }
                              className="w-24 border rounded p-1 text-xs"
                            />
                          </td>
                          <td className="p-2.5">
                            <select
                              value={tier.discount_type}
                              disabled={isReadonly}
                              onChange={(e) =>
                                updateVolumeDiscountRow(
                                  activeItemIdx,
                                  tierIdx,
                                  "discount_type",
                                  e.target.value,
                                )
                              }
                              className="border rounded p-1 text-xs"
                            >
                              <option value="PERCENTAGE">Percentage (%)</option>
                              <option value="FIXED_AMOUNT">Fixed Value</option>
                            </select>
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={tier.discount_value}
                              disabled={isReadonly}
                              onChange={(e) =>
                                updateVolumeDiscountRow(
                                  activeItemIdx,
                                  tierIdx,
                                  "discount_value",
                                  e.target.value,
                                )
                              }
                              className="w-24 border rounded p-1 text-xs"
                            />
                          </td>
                          <td className="p-2.5 font-semibold text-emerald-600">
                            <input
                              type="number"
                              value={tier.discounted_price}
                              disabled={isReadonly}
                              onChange={(e) =>
                                updateVolumeDiscountRow(
                                  activeItemIdx,
                                  tierIdx,
                                  "discounted_price",
                                  e.target.value,
                                )
                              }
                              className="w-24 border rounded p-1 text-xs bg-slate-50"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            {!isReadonly && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeVolumeDiscountRow(
                                    activeItemIdx,
                                    tierIdx,
                                  )
                                }
                                className="text-slate-400 hover:text-red-600 font-bold px-2"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals for Item & Salesperson Lookups */}
      {isItemModalOpen && (
        <ItemLookupModal
          open={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          multiple={true}
          onSelectMultiple={handleMultipleItemSelect}
        />
      )}

      {isSalespersonModalOpen && (
        <SalespersonLookupModal
          open={isSalespersonModalOpen}
          onClose={() => setIsSalespersonModalOpen(false)}
          // onSelect={handleAssignPersonSelect}
          onSelect={(emp: Employee) => {
            onRequestEdit?.();
            setPriceLists(
              priceLists.map((list, idx) =>
                idx === selectedListIdx
                  ? {
                      ...list,
                      salesperson_id: emp.id,
                      salesperson_name:
                        emp.employee_code + "-" + emp.display_name,
                    }
                  : list,
              ),
            );
            setIsSalespersonModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
