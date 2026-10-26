// app/components/parties/tabs/PriceListTab.tsx

"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

import MasterDropdown from "@/app/components/common/MasterDropdown";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parse, parseISO, isValid } from "date-fns";
import NumericTextInput from "@/components/ui/NumericTextInput";

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

type PriceHistoryRecord = {
  id: string;
  old_offered_price: number | null;
  new_offered_price: number;
  old_min_order_qty: number | null;
  new_min_order_qty: number;
  old_max_order_qty: number | null;
  new_max_order_qty: number | null;
  changed_at: string;
  changed_by_name: string | null;
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

  // History Modal States
  const [historyModalItem, setHistoryModalItem] = useState<{
    priceListItemId: string;
    itemName: string;
  } | null>(null);
  const [historyLogs, setHistoryLogs] = useState<PriceHistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSalespersonModalOpen, setIsSalespersonModalOpen] = useState(false);

  const activeList = priceLists[selectedListIdx] || null;
  const enforcedListType = partyType === "supplier" ? "PURCHASE" : "SALES";

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
      currency_id: baseCurrencyId || "",
      offer_method: "Phone", //"Fixed Price",
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

    setPriceLists((current) =>
      current.map((list, idx) =>
        idx === selectedListIdx ? { ...list, [key]: val } : list,
      ),
    );
  };

  const updateSelectedList = (
    updater: (list: PriceListDraft) => PriceListDraft,
  ) => {
    setPriceLists((current) =>
      current.map((list, idx) =>
        idx === selectedListIdx ? updater(list) : list,
      ),
    );
  };

  const calculateDiscountedPrice = (
    basePrice: number | string,
    discountType: "PERCENTAGE" | "FIXED_AMOUNT",
    discountValue: number | string,
  ): number => {
    const price = Number(basePrice);
    const discount = Number(discountValue);

    if (
      !Number.isFinite(price) ||
      !Number.isFinite(discount) ||
      price < 0 ||
      discount < 0
    ) {
      return 0;
    }

    const discountedPrice =
      discountType === "PERCENTAGE"
        ? price - (price * discount) / 100
        : price - discount;

    return Math.round(Math.max(0, discountedPrice) * 100) / 100;
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
      standard_price: Number(
        item.standard_sales_price || item.standard_cost || 0,
      ).toFixed(2),
      offered_price: Number(
        item.standard_sales_price || item.standard_cost || 0,
      ).toFixed(2),
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

    updateSelectedList((list) => ({
      ...list,
      items: list.items.map((item, idx) => {
        if (idx !== itemIdx) return item;

        const updatedItem = { ...item, [key]: val };

        if (key === "offered_price") {
          updatedItem.volume_discounts = item.volume_discounts.map((tier) => ({
            ...tier,
            discounted_price: calculateDiscountedPrice(
              val as number | string,
              tier.discount_type,
              tier.discount_value,
            ),
          }));
        }

        return updatedItem;
      }),
    }));
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

  const fetchHistory = async (priceListItemId: string, itemName: string) => {
    if (!priceListItemId) return;
    setHistoryModalItem({ priceListItemId, itemName });
    setIsLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/inventory/items/price-history/${priceListItemId}`,
      );
      const data = await res.json();
      setHistoryLogs(data.history || []);
    } catch (err) {
      console.error("Failed to load price history", err);
      setHistoryLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
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
      if (idx !== itemIdx) return item;

      const updatedTiers = item.volume_discounts.map((tier, tIdx) => {
        if (tIdx !== tierIdx) return tier;

        const updatedTier = { ...tier, [key]: val };

        // Recalculate when discount type or discount value changes.
        if (key === "discount_type" || key === "discount_value") {
          updatedTier.discounted_price = calculateDiscountedPrice(
            item.offered_price,
            updatedTier.discount_type,
            updatedTier.discount_value,
          );
        }

        return updatedTier;
      });

      return { ...item, volume_discounts: updatedTiers };
    });

    setPriceLists((current) =>
      current.map((list, idx) =>
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

  const getInputClass = (errorKey: string, disabled: boolean = isReadonly) => {
    const baseClasses =
      "w-full border p-2 py-1 h-7 rounded text-xs outline-none transition-colors duration-150";

    if (disabled) {
      return `${baseClasses} bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none`;
    }

    const stateClasses = errors[errorKey]
      ? "border-red-500 bg-red-50/10 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

    return `${baseClasses} ${stateClasses}`;
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
            {/* <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-3"> */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-2">
              <div className="space-y-2">
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
                      <option value="Phone">Phone</option>
                      <option value="Email">Email</option>
                      {/* <option value="Fixed Price">Fixed Price</option>
                    <option value="Percentage Discount">
                      Percentage Discount
                    </option> */}
                    </select>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
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
                      // minDate={new Date()}
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
                      className="w-full border p-2 py-1 h-7 rounded text-xs outline-none transition-colors duration-150"
                      disabled={true} // Locked to party base currency
                    />
                  </div>
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
                  Add Item
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
                        <NumericTextInput
                          allowDecimals
                          decimalScale={2}
                          value={Number(item.offered_price ?? 0)}
                          onChange={(val) =>
                            updateItemRow(itemIdx, "offered_price", val)
                          }
                          disabled={isReadonly}
                          className="w-24 border rounded p-1.5 font-semibold text-xs text-right"
                        />
                      </td>
                      <td className="p-3">
                        <NumericTextInput
                          allowDecimals={false}
                          value={Number(item.min_order_qty ?? 0)}
                          onChange={(val) =>
                            updateItemRow(itemIdx, "min_order_qty", val)
                          }
                          disabled={isReadonly}
                          className="w-16 border rounded p-1 text-xs bg-transparent text-right"
                        />
                      </td>
                      <td className="p-3">
                        <NumericTextInput
                          allowDecimals={false}
                          value={Number(item.max_order_qty ?? 0)}
                          onChange={(val) =>
                            updateItemRow(itemIdx, "max_order_qty", val)
                          }
                          disabled={isReadonly}
                          className="w-16 border rounded p-1 text-xs bg-transparent text-right"
                        />
                      </td>
                      <td className="p-3 text-center">
                        {/* <input
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
                        /> */}
                      <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveItemIdx(
                              itemIdx === activeItemIdx ? null : itemIdx,
                            );
                            if (!item.has_volume_discount && item.volume_discounts.length === 0) {
                              addVolumeDiscountRow(itemIdx);
                            }
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                            item.has_volume_discount && item.volume_discounts.length > 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-slate-100 text-slate-600 border-slate-300"
                          }`}
                        >
                          {item.has_volume_discount && item.volume_discounts.length > 0
                            ? `${item.volume_discounts.length} Tiers`
                            : "Configure Tiers"}
                        </button>
                      </td>

                      <td className="p-3 text-right space-x-2">
                        {item.id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchHistory(item.id!, item.name);
                            }}
                            className="text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            History
                          </button>
                        )}
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
                    Add Tier
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
                            <NumericTextInput
                              allowDecimals={false}
                              value={Number(tier.min_order_qty ?? 0)}
                              onChange={(val) =>
                                updateVolumeDiscountRow(
                                  activeItemIdx,
                                  tierIdx,
                                  "min_order_qty",
                                  val,
                                )
                              }
                              disabled={isReadonly}
                              className="w-24 border rounded p-1 text-xs bg-transparent text-right"
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
                            <NumericTextInput
                              allowDecimals
                              decimalScale={2}
                              value={Number(tier.discount_value ?? 0)}
                              onChange={(val) =>
                                updateVolumeDiscountRow(
                                  activeItemIdx,
                                  tierIdx,
                                  "discount_value",
                                  val,
                                )
                              }
                              disabled={isReadonly}
                              className="w-24 border rounded p-1 font-semibold text-xs text-right"
                            />
                          </td>
                          <td className="p-2.5 font-semibold text-emerald-600">
                            <input
                              type="number"
                              value={tier.discounted_price}
                              readOnly
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

      {/* ================= HISTORY MODAL ================= */}
      {historyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center border-b pb-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Price Update History — {historyModalItem.itemName}
              </h4>
              <button
                onClick={() => setHistoryModalItem(null)}
                className="text-slate-500 hover:text-red-500 font-bold"
              >
                ✕
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="p-8 text-center text-slate-400">
                Loading history logs...
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic">
                No price update history found.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto border rounded">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b">
                      <th className="p-2.5">Date & Time</th>
                      <th className="p-2.5">Updated By</th>
                      <th className="p-2.5 text-right">Old Price</th>
                      <th className="p-2.5 text-right">New Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b hover:bg-slate-50/50"
                      >
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">
                          {format(log.changed_at, "dd/MM/yyyy hh:mm:ss")}
                        </td>
                        <td className="p-2.5 font-medium">
                          {log.changed_by_name || "System User"}
                        </td>
                        <td className="p-2.5 text-right text-slate-500">
                          {log.old_offered_price
                            ? Number(log.old_offered_price)?.toFixed(2)
                            : "-"}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-emerald-600">
                          {Number(log.new_offered_price)?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Item & Salesperson Lookups */}
      {isItemModalOpen && (
        <ItemLookupModal
          open={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          multiple={true}
          onSelect={(item) => handleMultipleItemSelect([item])}
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
