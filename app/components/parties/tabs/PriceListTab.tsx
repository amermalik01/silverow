// app/components/parties/tabs/PriceListTab.tsx

"use client";

import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { format, isValid, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";
import MasterDropdown from "@/app/components/common/MasterDropdown";
import SalespersonLookupModal, {
  Employee,
} from "@/app/components/shared/modals/SalespersonLookupModal";
import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";

export interface VolumeDiscountDraft {
  id?: string;
  min_order_qty: number;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT";
  discount_value: number;
  discounted_price: number;
}

export interface PriceListItemDraft {
  id?: string;
  item_id: string | number;
  item_code: string;
  name: string;
  category_name?: string;
  uom_id?: string | number;
  uom_name?: string;
  standard_price: number | string;
  offered_price: number | string;
  min_order_qty: number;
  max_order_qty: number;
  has_volume_discount: boolean;
  volume_discounts: VolumeDiscountDraft[];
  is_override_enabled?: boolean;
  is_active?: boolean;
}

export interface PriceListDraft {
  id?: string;
  party_id?: string | number;
  name: string;
  list_type: "SALES" | "PURCHASE";
  start_date: string;
  end_date: string;
  // currency_id: string | number;
  currency_id: string;
  currency_code?: string;
  offer_method: string;
  salesperson_id?: string | number;
  salesperson_name?: string;
  default_discount_pct?: number;
  items: PriceListItemDraft[];
}

export interface PriceHistoryRecord {
  id?: string;
  changed_at?: string;
  changed_by?: string;
  old_price?: number | string;
  new_price?: number | string;
  notes?: string;
}

type Props = {
  partyId?: string | number;
  partyType?: "customer" | "supplier" | "lead" | string;
  baseCurrencyId?: string;
  priceLists: PriceListDraft[];
  setPriceLists: React.Dispatch<React.SetStateAction<PriceListDraft[]>>;
  isReadonly?: boolean;
  errors: Record<string, string>;
  onRequestEdit?: () => void;
  onSave?: () => void;
  onImportExport?: (mode: "import" | "export") => void;
};

function parseStoredDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

function formatMoney(val: number | string | undefined): string {
  const num = Number(val);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getListStatus(list: PriceListDraft): {
  label: "Active" | "Scheduled" | "Expired";
  badgeClass: string;
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = parseStoredDate(list.start_date);
  const end = parseStoredDate(list.end_date);

  if (end && end < now) {
    return {
      label: "Expired",
      badgeClass:
        "bg-slate-100 text-black border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    };
  }
  if (start && start > now) {
    return {
      label: "Scheduled",
      badgeClass:
        "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800/60",
    };
  }
  return {
    label: "Active",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60",
  };
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
  onSave,
  onImportExport,
}: Props) {
  const [selectedListIdx, setSelectedListIdx] = useState<number>(0);
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [showHeaderSettings, setShowHeaderSettings] = useState<boolean>(false);

  // Table search, filter, sort & selection state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [overrideFilter, setOverrideFilter] = useState<
    "all" | "overridden" | "standard" | "tiered"
  >("all");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "price_desc">(
    "name_asc",
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [importExportOpen, setImportExportOpen] = useState<boolean>(false);

  // History Modal States
  const [historyModalItem, setHistoryModalItem] = useState<{
    priceListItemId: string;
    itemName: string;
  } | null>(null);
  const [historyLogs, setHistoryLogs] = useState<PriceHistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Lookup Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSalespersonModalOpen, setIsSalespersonModalOpen] = useState(false);

  const activeList = priceLists[selectedListIdx] || null;
  const enforcedListType: "SALES" | "PURCHASE" =
    partyType === "supplier" ? "PURCHASE" : "SALES";

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
      offer_method: "Phone",
      items: [],
    };
    setPriceLists((prev) => {
      const next = [...prev, newList];
      setSelectedListIdx(next.length - 1);
      return next;
    });
    setActiveItemIdx(null);
    setShowHeaderSettings(true);
  };

  const updateActiveListHeader = (
    key: keyof PriceListDraft,
    val: string | boolean | number,
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

  const handleAssignPersonSelect = (emp: Employee) => {
    updateActiveListHeader("salesperson_id", emp.id);
    updateActiveListHeader(
      "salesperson_name",
      `${emp.employee_code}-${emp.display_name}`,
    );
    setIsSalespersonModalOpen(false);
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

  const getEffectiveDiscountPct = (item: PriceListItemDraft): number => {
    const std = Number(item.standard_price);
    const offered = Number(item.offered_price);
    if (Number.isFinite(std) && std > 0 && Number.isFinite(offered)) {
      const pct = ((std - offered) / std) * 100;
      if (pct > 0) return Math.round(pct * 10) / 10;
    }
    return activeList?.default_discount_pct ?? 0;
  };

  const handleMultipleItemSelect = async (items: ItemLookupRecord[]) => {
    if (!items.length || !activeList) {
      setIsItemModalOpen(false);
      return;
    }

    onRequestEdit?.();
    const newItems: PriceListItemDraft[] = items.map((item) => {
      const stdPrice = Number(
        item.standard_sales_price || item.standard_cost || 0,
      );
      return {
        item_id: item.id,
        item_code: item.item_code || "",
        name: item.name || "",
        category_name: "",
        uom_id: item.base_uom_id || "",
        uom_name: item.base_uom_name || "",
        standard_price: stdPrice.toFixed(2),
        offered_price: stdPrice.toFixed(2),
        min_order_qty: 1,
        max_order_qty: 100,
        has_volume_discount: false,
        volume_discounts: [],
        is_override_enabled: false,
        is_active: true,
      };
    });

    updateSelectedList((list) => ({
      ...list,
      items: [...list.items, ...newItems],
    }));
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
    updateSelectedList((list) => ({ ...list, items: updatedItems }));
    if (activeItemIdx === itemIdx) setActiveItemIdx(null);
  };

  const fetchHistory = async (priceListItemId: string, itemName: string) => {
    if (!priceListItemId) return;

    setHistoryModalItem({ priceListItemId, itemName });
    setHistoryLogs([]);
    setIsLoadingHistory(true);

    try {
      const res = await fetch(
        `/api/inventory/items/price-history/${priceListItemId}`,
      );

      if (!res.ok) {
        throw new Error("Failed to load price history");
      }

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
          discounted_price: calculateDiscountedPrice(
            item.offered_price,
            "PERCENTAGE",
            5,
          ),
        };
        return {
          ...item,
          has_volume_discount: true,
          volume_discounts: [...item.volume_discounts, newTier],
        };
      }
      return item;
    });

    updateSelectedList((list) => ({ ...list, items: updatedItems }));
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

    updateSelectedList((list) => ({ ...list, items: updatedItems }));
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

    updateSelectedList((list) => ({ ...list, items: updatedItems }));
  };

  const getInputClass = (errorKey: string, disabled: boolean = isReadonly) => {
    const baseClasses =
      "w-full border px-2.5 py-1.5 rounded-lg text-sm outline-none transition-colors duration-150";

    if (disabled) {
      return `${baseClasses} bg-slate-100/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-black dark:text-slate-300 cursor-not-allowed select-none`;
    }

    const stateClasses = errors[errorKey]
      ? "border-red-500 bg-red-50/20 text-black dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-black dark:text-slate-100 focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-600 dark:focus:ring-emerald-500";

    return `${baseClasses} ${stateClasses}`;
  };

  const filteredItems = useMemo(() => {
    if (!activeList) return [];
    const q = searchQuery.trim().toLowerCase();

    const matched = activeList.items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        const hasOverride =
          Boolean(item.is_override_enabled) ||
          Number(item.offered_price) !== Number(item.standard_price);
        if (overrideFilter === "overridden" && !hasOverride) return false;
        if (overrideFilter === "standard" && hasOverride) return false;
        if (
          overrideFilter === "tiered" &&
          (!item.has_volume_discount || item.volume_discounts.length === 0)
        ) {
          return false;
        }
        if (!q) return true;
        return (
          (item.name || "").toLowerCase().includes(q) ||
          (item.item_code || "").toLowerCase().includes(q) ||
          (item.category_name || "").toLowerCase().includes(q)
        );
      });

    return [...matched].sort((a, b) => {
      if (sortBy === "name_desc") {
        return (b.item.name || "").localeCompare(a.item.name || "");
      }
      if (sortBy === "price_desc") {
        return (
          Number(b.item.standard_price || 0) -
          Number(a.item.standard_price || 0)
        );
      }
      return (a.item.name || "").localeCompare(b.item.name || "");
    });
  }, [activeList, searchQuery, overrideFilter, sortBy]);

  const defaultDiscountDisplay = useMemo(() => {
    if (!activeList) return "0%";
    if (typeof activeList.default_discount_pct === "number") {
      return `${activeList.default_discount_pct}%`;
    }
    const firstWithDiscount = activeList.items.find(
      (i) => getEffectiveDiscountPct(i) > 0,
    );
    if (firstWithDiscount) {
      return `${getEffectiveDiscountPct(firstWithDiscount)}%`;
    }
    return "0%";
  }, [activeList]);

  const quantityDiscountSourceItem = useMemo(() => {
    if (!activeList) return null;
    if (activeItemIdx !== null && activeList.items[activeItemIdx]) {
      return activeList.items[activeItemIdx];
    }
    return (
      activeList.items.find(
        (i) => i.has_volume_discount && i.volume_discounts.length > 0,
      ) || null
    );
  }, [activeList, activeItemIdx]);

  const cardClass =
    "rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#11161D] shadow-2xs transition-colors";

  const toggleRowSelection = (key: string) => {
    setSelectedRowKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Price List Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {priceLists.map((list, idx) => (
            <button
              key={list.id || idx}
              type="button"
              onClick={() => {
                setSelectedListIdx(idx);
                setActiveItemIdx(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                selectedListIdx === idx
                  ? "bg-emerald-700 text-white dark:bg-emerald-600"
                  : "text-black hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/70"
              }`}
            >
              {list.name || `Price List ${idx + 1}`}
            </button>
          ))}
        </div>

        <Button
          type="button"
          onClick={addPriceList}
          variant="add_line"
          className="rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-1.5 inline-flex items-center gap-1.5"
        >
          <Icon icon="tabler:plus" className="text-emerald-800 text-xl" />
          <span>Add Price List</span>
        </Button>
      </div>

      {priceLists.length === 0 || !activeList ? (
        <div className="p-8 text-center text-sm border border-dashed rounded-xl border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#11161D]/50 text-slate-400">
          No price lists assigned to this profile.
        </div>
      ) : (
        <div className="space-y-4">
          {/* TOP 3-CARD OVERVIEW STRIP */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* 1. Assigned Price List Card */}
            <section
              className={`${cardClass} lg:col-span-5 p-4 flex flex-col justify-between gap-3`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-black dark:text-slate-100">
                  <Icon
                    icon="tabler:tag"
                    className="text-emerald-800 text-xl"
                  />
                  <span>
                    {partyType === "supplier"
                      ? "Supplier Price List"
                      : "Customer Price List"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowHeaderSettings((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-black hover:text-black dark:text-slate-400 dark:hover:text-slate-100"
                >
                  <Icon icon="tabler:adjustments" className="text-emerald-800 text-xl" />
                  <span>{showHeaderSettings ? "Hide Terms" : "Terms"}</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-black dark:text-slate-400 mb-1.5">
                  Assigned Price List
                </label>
                <div className="flex items-center gap-2.5">
                  <select
                    aria-label="Assigned Price List"
                    value={selectedListIdx}
                    onChange={(e) => {
                      setSelectedListIdx(Number(e.target.value));
                      setActiveItemIdx(null);
                    }}
                    className="flex-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold text-black dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-emerald-600 dark:focus:border-emerald-500"
                  >
                    {priceLists.map((list, idx) => (
                      <option key={list.id || idx} value={idx}>
                        {list.name || `Price List ${idx + 1}`}
                      </option>
                    ))}
                  </select>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${
                      getListStatus(activeList).badgeClass
                    }`}
                  >
                    {getListStatus(activeList).label}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-black dark:text-slate-400">
                <span>
                  Currency:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {activeList.currency_code ||
                      String(activeList.currency_id || baseCurrencyId || "GBP")}
                  </strong>
                </span>
                <span>|</span>
                <span>
                  {activeList.start_date || "—"} → {activeList.end_date || "—"}
                </span>
              </div>
            </section>

            {/* 2. Default Discount Card */}
            <section
              className={`${cardClass} lg:col-span-3 p-4 flex flex-col justify-center gap-2`}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                %
              </div>
              <p className="text-sm font-medium text-black dark:text-slate-400">
                Default Discount
              </p>
              <p className="text-2xl font-bold text-black dark:text-slate-100 tabular-nums">
                {defaultDiscountDisplay}
              </p>
            </section>

            {/* 3. Quantity Discount (Additional) Card */}
            <section
              className={`${cardClass} lg:col-span-4 p-4 flex flex-col justify-between`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-black dark:text-slate-100 mb-2">
                <Icon
                  icon="tabler:stack-2"
                  className="text-emerald-800 text-3xl"
                />
                <span>Quantity Discount (Additional)</span>
              </div>

              {quantityDiscountSourceItem &&
              quantityDiscountSourceItem.volume_discounts.length > 0 ? (
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-black dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <span>Order Quantity</span>
                    <span>Additional Discount</span>
                  </div>
                  {quantityDiscountSourceItem.volume_discounts
                    .slice(0, 3)
                    .map((tier, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between tabular-nums"
                      >
                        <span className="text-slate-700 dark:text-slate-300">
                          {tier.min_order_qty}+ units
                        </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {tier.discount_type === "PERCENTAGE"
                            ? `+${tier.discount_value}%`
                            : `-${formatMoney(tier.discount_value)}`}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-black dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <span>Order Quantity</span>
                    <span>Additional Discount</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-black dark:text-slate-400">
                      Standard Tier
                    </span>
                    <span className="text-black dark:text-slate-400">
                      — (Standard price)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">
                    Select &ldquo;Tiers&rdquo; on any item row to configure
                    volume breaks.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* COLLAPSIBLE PRICE LIST HEADER TERMS */}
          {showHeaderSettings && (
            <div className={`${cardClass} p-4`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <label className="col-span-4 text-sm font-medium text-black dark:text-slate-400">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <div className="col-span-8">
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

                  <div className="grid grid-cols-12 gap-2 items-center">
                    <label className="col-span-4 text-sm font-medium text-black dark:text-slate-400">
                      {partyType === "customer"
                        ? "Salesperson"
                        : partyType === "supplier"
                          ? "Purchaser"
                          : "Assign Person"}
                    </label>
                    <div className="col-span-8 flex gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={
                          activeList.salesperson_name || "Select Person..."
                        }
                        className={getInputClass(
                          `priceLists.${selectedListIdx}.salesperson_id`,
                        )}
                      />
                      {!isReadonly && (
                        <button
                          type="button"
                          onClick={() => setIsSalespersonModalOpen(true)}
                          className="px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          <Icon
                            icon="tabler:external-link"
                            className="w-4 h-4"
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-center">
                    <label className="col-span-4 text-sm font-medium text-black dark:text-slate-400">
                      Offer Method
                    </label>
                    <div className="col-span-8">
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
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <label className="col-span-4 text-sm font-medium text-black dark:text-slate-400">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <div className="col-span-8">
                      <input
                        type="date"
                        value={activeList.start_date || ""}
                        disabled={isReadonly}
                        max={activeList.end_date || undefined}
                        onChange={(e) =>
                          updateActiveListHeader("start_date", e.target.value)
                        }
                        className={`${getInputClass(
                          `priceLists.${selectedListIdx}.start_date`,
                        )} tabular-nums`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-center">
                    <label className="col-span-4 text-sm font-medium text-black dark:text-slate-400">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <div className="col-span-8">
                      <input
                        type="date"
                        value={activeList.end_date || ""}
                        disabled={isReadonly}
                        min={activeList.start_date || undefined}
                        onChange={(e) =>
                          updateActiveListHeader("end_date", e.target.value)
                        }
                        className={`${getInputClass(
                          `priceLists.${selectedListIdx}.end_date`,
                        )} tabular-nums`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-center">
                    <label className="col-span-4 text-sm font-medium text-black dark:text-slate-400">
                      Currency <span className="text-red-500">*</span>
                    </label>
                    <div className="col-span-8">
                      <MasterDropdown
                        type="Currency"
                        value={activeList.currency_id || baseCurrencyId}
                        displayFormat="name"
                        valueKey="id"
                        onChange={(val) =>
                          updateActiveListHeader("currency_id", val ?? "")
                        }
                        className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 rounded-lg text-sm"
                        disabled={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SPECIAL PRICES TABLE CARD */}
          <section className={`${cardClass} overflow-hidden`}>
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Icon
                    icon="tabler:discount-2"
                    className="text-emerald-800 text-3xl"
                  />
                  <h4 className="text-sm font-semibold text-black dark:text-slate-100">
                    Special Prices
                  </h4>
                </div>
                <p className="text-[11px] text-black dark:text-slate-400 mt-0.5">
                  Customer-specific prices or discounts (override standard
                  discount)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:w-48">
                  <Icon
                    icon="tabler:search"
                    className="w-3.5 h-3.5 text-emerald-800 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search product..."
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-black dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 dark:focus:border-emerald-500"
                  />
                </div>

                <select
                  aria-label="Filter items"
                  value={overrideFilter}
                  onChange={(e) =>
                    setOverrideFilter(
                      e.target.value as
                        | "all"
                        | "overridden"
                        | "standard"
                        | "tiered",
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-600"
                >
                  <option value="all">Filter</option>
                  <option value="overridden">Special Price Only</option>
                  <option value="standard">Standard Price</option>
                  <option value="tiered">Volume Discount</option>
                </select>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setImportExportOpen((prev) => !prev)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-sm font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5"
                  >
                    <Icon icon="tabler:upload" className="w-3.5 h-3.5" />
                    <span>Import / Export</span>
                    <Icon icon="tabler:chevron-down" className="w-3.5 h-3.5" />
                  </button>

                  {importExportOpen && (
                    <div className="absolute right-0 top-9 z-20 w-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161D] shadow-lg py-1 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setImportExportOpen(false);
                          onImportExport?.("import");
                        }}
                        className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      >
                        Import Prices
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImportExportOpen(false);
                          onImportExport?.("export");
                        }}
                        className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      >
                        Export CSV / Excel
                      </button>
                    </div>
                  )}
                </div>

                {!isReadonly && (
                  <Button
                    type="button"
                    onClick={() => setIsItemModalOpen(true)}
                    variant="add_line"
                    className="rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-1.5 inline-flex items-center gap-1.5"
                  >
                    <Icon icon="tabler:plus" className="w-3.5 h-3.5" />
                    <span>Add Product</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-black dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
                    <th className="py-2.5 pl-4 pr-2 w-8">
                      <input
                        type="checkbox"
                        aria-label="Select all products"
                        checked={
                          filteredItems.length > 0 &&
                          selectedRowKeys.length === filteredItems.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRowKeys(
                              filteredItems.map(({ item, originalIndex }) =>
                                String(item.id ?? originalIndex),
                              ),
                            );
                          } else {
                            setSelectedRowKeys([]);
                          }
                        }}
                        className="rounded border-slate-300 dark:border-slate-700"
                      />
                    </th>
                    <th className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() =>
                          setSortBy((prev) =>
                            prev === "name_asc"
                              ? "name_desc"
                              : prev === "name_desc"
                                ? "price_desc"
                                : "name_asc",
                          )
                        }
                        className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <span>Product</span>
                        <Icon icon="tabler:selector" className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-right">List Price</th>
                    <th className="py-2.5 px-3 text-center">Discount</th>
                    <th className="py-2.5 px-3 text-right">Customer Price</th>
                    <th className="py-2.5 px-3 bg-emerald-50/40 dark:bg-emerald-950/20">
                      Special Price (Override)
                    </th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-8 text-center text-slate-400 italic"
                      >
                        {activeList.items.length === 0
                          ? 'No items added to this price list yet. Click "+ Add Product" to select items via lookup.'
                          : "No products match your search or filter."}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(({ item, originalIndex: itemIdx }) => {
                      const rowKey = String(item.id ?? itemIdx);
                      const discountPct = getEffectiveDiscountPct(item);
                      const isOverrideActive = Boolean(
                        item.is_override_enabled,
                      );

                      return (
                        <tr
                          key={rowKey}
                          onClick={() => setActiveItemIdx(itemIdx)}
                          className={`cursor-pointer transition-colors ${
                            activeItemIdx === itemIdx
                              ? "bg-emerald-50/35 dark:bg-emerald-950/20"
                              : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <td
                            className="py-3 pl-4 pr-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedRowKeys.includes(rowKey)}
                              onChange={() => toggleRowSelection(rowKey)}
                              className="rounded border-slate-300 dark:border-slate-700"
                            />
                          </td>

                          {/* Product */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-black dark:text-slate-300 shrink-0">
                                <Icon icon="tabler:box" className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-black dark:text-slate-100 truncate">
                                  {item.name}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {item.uom_name || "Pcs"} • Min{" "}
                                  {item.min_order_qty ?? 1} / Max{" "}
                                  {item.max_order_qty ?? 100}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="py-3 px-3 font-mono text-[11px] text-black dark:text-slate-300 whitespace-nowrap">
                            {item.item_code || "—"}
                          </td>

                          {/* List Price */}
                          <td className="py-3 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatMoney(item.standard_price)}
                          </td>

                          {/* Discount */}
                          <td className="py-3 px-3 text-center whitespace-nowrap tabular-nums">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              {discountPct > 0 ? `${discountPct}%` : "0%"}
                            </span>
                          </td>

                          {/* Customer Price */}
                          <td className="py-3 px-3 text-right font-semibold tabular-nums text-black dark:text-slate-100 whitespace-nowrap">
                            {formatMoney(item.offered_price)}
                          </td>

                          {/* Special Price (Override) + Switch */}
                          <td
                            className="py-3 px-3 bg-emerald-50/25 dark:bg-emerald-950/10 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <NumericTextInput
                                allowDecimals
                                decimalScale={2}
                                value={Number(item.offered_price ?? 0)}
                                onChange={(val) =>
                                  updateItemRow(itemIdx, "offered_price", val)
                                }
                                disabled={isReadonly}
                                className="w-24 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-2 py-1 font-semibold text-sm text-right tabular-nums"
                              />

                              <button
                                type="button"
                                role="switch"
                                aria-checked={isOverrideActive}
                                disabled={isReadonly}
                                onClick={() =>
                                  updateItemRow(
                                    itemIdx,
                                    "is_override_enabled",
                                    !isOverrideActive,
                                  )
                                }
                                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
                                  isOverrideActive
                                    ? "bg-emerald-600 border-emerald-600"
                                    : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                                } ${
                                  isReadonly
                                    ? "opacity-60 cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-2xs transition-transform ${
                                    isOverrideActive
                                      ? "translate-x-4.5"
                                      : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                              {item.is_active === false ? "Inactive" : "Active"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td
                            className="py-3 px-4 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveItemIdx(
                                    itemIdx === activeItemIdx ? null : itemIdx,
                                  );
                                  if (
                                    !item.has_volume_discount &&
                                    item.volume_discounts.length === 0
                                  ) {
                                    addVolumeDiscountRow(itemIdx);
                                  }
                                }}
                                className="px-2 py-1 rounded-md text-[11px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Volume Discount Tiers"
                              >
                                {item.has_volume_discount &&
                                item.volume_discounts.length > 0
                                  ? `${item.volume_discounts.length} Tiers`
                                  : "Tiers"}
                              </button>

                              {item.id && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    fetchHistory(item.id!, item.name)
                                  }
                                  className="p-1.5 rounded-lg text-black hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title="Price History"
                                >
                                  <Icon
                                    icon="tabler:history"
                                    className="w-4 h-4"
                                  />
                                </button>
                              )}

                              {!isReadonly && (
                                <button
                                  type="button"
                                  onClick={() => removeItemRow(itemIdx)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                                  title="Remove Item"
                                >
                                  <Icon
                                    icon="tabler:trash"
                                    className="w-4 h-4"
                                  />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800/80 text-sm text-black dark:text-slate-400 tabular-nums">
              Showing {filteredItems.length} of {activeList.items.length}{" "}
              products
            </div>
          </section>

          {/* VOLUME DISCOUNT TIERS PANEL */}
          {activeItemIdx !== null && activeList.items[activeItemIdx] && (
            <div className={`${cardClass} p-4 space-y-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h5 className="text-sm font-bold text-black dark:text-slate-100">
                  Volume Discount Tiers for{" "}
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {activeList.items[activeItemIdx].name || "Selected Item"}
                  </span>{" "}
                  ({activeList.items[activeItemIdx].item_code || "SKU"})
                </h5>

                {!isReadonly && (
                  <Button
                    type="button"
                    onClick={() => addVolumeDiscountRow(activeItemIdx)}
                    variant="add_line"
                    className="rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-1"
                  >
                    Add Tier
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-black dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50">
                      <th className="p-2.5">Min Order Qty</th>
                      <th className="p-2.5">Discount Type</th>
                      <th className="p-2.5">Discount By</th>
                      <th className="p-2.5">Discounted Price</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                          <tr key={tierIdx}>
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
                                className="w-24 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-2 py-1 text-sm text-right tabular-nums"
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
                                className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-2 py-1 text-sm"
                              >
                                <option value="PERCENTAGE">
                                  Percentage (%)
                                </option>
                                <option value="FIXED_AMOUNT">
                                  Fixed Value
                                </option>
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
                                className="w-24 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-2 py-1 font-semibold text-sm text-right tabular-nums"
                              />
                            </td>
                            <td className="p-2.5 font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                              <input
                                type="text"
                                value={formatMoney(tier.discounted_price)}
                                readOnly
                                className="w-24 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-sm bg-slate-50 dark:bg-slate-900 text-right tabular-nums"
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
            </div>
          )}

          {/* Optional Bottom Edit / Save Bar */}
          {(onRequestEdit || onSave) && (
            <div className="flex items-center justify-end gap-2.5 pt-1">
              {onRequestEdit && (
                <button
                  type="button"
                  onClick={onRequestEdit}
                  className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161D] hover:bg-slate-50 dark:hover:bg-slate-800/70 text-sm font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5"
                >
                  <Icon icon="tabler:pencil" className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
              {onSave && (
                <button
                  type="button"
                  onClick={onSave}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-sm font-semibold text-white inline-flex items-center gap-1.5"
                >
                  <Icon icon="tabler:device-floppy" className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Item Lookup Modal */}

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

      {/* History Modal */}
      {historyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#11161D] rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 p-4">
              <div>
                <h4 className="font-bold text-sm text-black dark:text-slate-100">
                  Complete Price List History
                </h4>
                <p className="text-sm text-black dark:text-slate-400 mt-0.5">
                  {historyModalItem.itemName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Icon icon="tabler:x" className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto text-sm">
              {isLoadingHistory ? (
                <p className="text-center py-6 text-slate-400 animate-pulse">
                  Loading price history...
                </p>
              ) : historyLogs.length === 0 ? (
                <p className="text-center py-6 text-slate-400">
                  No price history records found for this item.
                </p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-black">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Old Price</th>
                      <th className="py-2 px-3">New Price</th>
                      <th className="py-2 px-3">Updated By</th>
                      <th className="py-2 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                    {historyLogs.map((log, i) => (
                      <tr key={log.id || i}>
                        <td className="py-2 px-3">{log.changed_at || "—"}</td>
                        <td className="py-2 px-3">
                          {log.old_price != null
                            ? formatMoney(log.old_price)
                            : "—"}
                        </td>
                        <td className="py-2 px-3 font-semibold text-emerald-700 dark:text-emerald-400">
                          {log.new_price != null
                            ? formatMoney(log.new_price)
                            : "—"}
                        </td>
                        <td className="py-2 px-3">{log.changed_by || "—"}</td>
                        <td className="py-2 px-3">{log.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-950/50">
              <Button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* "use client";

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

type PriceHistorySnapshot = {
  price_list: Record<string, unknown>;
  price_list_item: Record<string, unknown>;
  volume_discounts: Record<string, unknown>[];
};

type PriceHistoryRecord = {
  id: string;
  item_id: string;
  price_list_id: string;
  price_list_item_id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  old_snapshot: PriceHistorySnapshot | null;
  new_snapshot: PriceHistorySnapshot | null;
  changed_fields: string[];
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

function formatHistoryDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, "dd/MM/yyyy HH:mm:ss");
}

function getHistoryActionClass(action: PriceHistoryRecord["action"]) {
  switch (action) {
    case "CREATE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "UPDATE":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "DELETE":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
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
    setHistoryLogs([]);
    setIsLoadingHistory(true);

    try {
      const res = await fetch(
        `/api/inventory/items/price-history/${priceListItemId}`,
      );

      if (!res.ok) {
        throw new Error("Failed to load price history");
      }

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
      "w-full border p-2 py-1 h-7 rounded text-sm outline-none transition-colors duration-150";

    if (disabled) {
      return `${baseClasses} bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-black dark:text-slate-400 cursor-not-allowed select-none`;
    }

    const stateClasses = errors[errorKey]
      ? "border-red-500 bg-red-50/10 text-black dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

    return `${baseClasses} ${stateClasses}`;
  };

  return (
    <div className="space-y-4">
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
              className={`px-3 py-1.5 text-sm font-semibold rounded-t transition-colors ${
                selectedListIdx === idx
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                  : "text-black hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {list.name || `Price List ${idx + 1}`}
            </button>
          ))}
        </div>
        <Button type="button" onClick={addPriceList} variant="add_line">
          Add Price List
        </Button>
      </div>

      {priceLists.length === 0 || !activeList ? (
        <div className="p-8 text-center text-sm border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400">
          No price lists assigned to this profile.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-2">
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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

                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-black"
                      >
                        <Icon icon="tabler:external-link" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                    </select>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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

                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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

                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                      className="w-full border p-2 py-1 h-7 rounded text-sm outline-none transition-colors duration-150"
                      disabled={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
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

            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-black font-semibold bg-slate-50/50 dark:bg-slate-800/20">
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
                      <td className="p-3 text-black">
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
                          className="w-24 border rounded p-1.5 font-semibold text-sm text-right"
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
                          className="w-16 border rounded p-1 text-sm bg-transparent text-right"
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
                          className="w-16 border rounded p-1 text-sm bg-transparent text-right"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveItemIdx(
                              itemIdx === activeItemIdx ? null : itemIdx,
                            );
                            if (
                              !item.has_volume_discount &&
                              item.volume_discounts.length === 0
                            ) {
                              addVolumeDiscountRow(itemIdx);
                            }
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                            item.has_volume_discount &&
                            item.volume_discounts.length > 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-slate-100 text-black border-slate-300"
                          }`}
                        >
                          {item.has_volume_discount &&
                          item.volume_discounts.length > 0
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

          {activeItemIdx !== null && activeList.items[activeItemIdx] && (
            <div className="p-4 rounded border border-blue-200 dark:border-blue-900 bg-blue-50/20 dark:bg-slate-900 space-y-3">
              <div className="flex justify-between items-center">
                <h5 className="text-sm font-bold text-blue-800 dark:text-blue-300">
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

              <table className="w-full text-left border-collapse text-sm bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-black bg-slate-50 dark:bg-slate-800/40">
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
                              className="w-24 border rounded p-1 text-sm bg-transparent text-right"
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
                              className="border rounded p-1 text-sm"
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
                              className="w-24 border rounded p-1 font-semibold text-sm text-right"
                            />
                          </td>
                          <td className="p-2.5 font-semibold text-emerald-600">
                            <input
                              type="number"
                              value={tier.discounted_price}
                              readOnly
                              className="w-24 border rounded p-1 text-sm bg-slate-50"
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

      {historyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">

            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 p-5">
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Complete Price List History
                </h4>
                <p className="text-sm text-black mt-1">
                  {historyModalItem.itemName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                className="text-black hover:text-red-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {isLoadingHistory ? (
                <div className="p-8 text-center text-slate-400">
                  Loading history logs...
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">
                  No price list history found.
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                  >
                    <div className="flex flex-wrap justify-between items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded border ${getHistoryActionClass(log.action)}`}
                        >
                          {log.action}
                        </span>

                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {log.changed_by_name || "System User"}
                          </p>
                          <p className="text-[11px] text-black">
                            {formatHistoryDate(log.changed_at)}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] text-black">
                        {log.changed_fields.length} changed section(s)
                      </span>
                    </div>

                    <div className="p-3 space-y-3">
                      <div>
                        <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Changed Fields
                        </h5>

                        <div className="flex flex-wrap gap-1.5">
                          {log.changed_fields.map((field) => (
                            <span
                              key={field}
                              className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] border border-blue-100 dark:border-blue-900"
                            >
                              {field.replaceAll("_", " ")}
                            </span>
                          ))}
                        </div>
                      </div>

                      <details className="border border-slate-200 dark:border-slate-700 rounded-md">
                        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                          View complete before and after details
                        </summary>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3">
                          <div className="min-w-0">
                            <h6 className="text-sm font-bold text-red-600 mb-2">
                              Before Change
                            </h6>

                            {log.old_snapshot ? (
                              <div className="space-y-3 text-sm">
                                <div>
                                  <p className="font-semibold mb-1 text-slate-700 dark:text-slate-300">
                                    Price List Settings
                                  </p>
                                  <pre className="text-[10px] whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                    {JSON.stringify(
                                      log.old_snapshot.price_list,
                                      null,
                                      2,
                                    )}
                                  </pre>
                                </div>

                                <div>
                                  <p className="font-semibold mb-1 text-slate-700 dark:text-slate-300">
                                    Item Pricing
                                  </p>
                                  <pre className="text-[10px] whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                    {JSON.stringify(
                                      log.old_snapshot.price_list_item,
                                      null,
                                      2,
                                    )}
                                  </pre>
                                </div>

                                <div>
                                  <p className="font-semibold mb-1 text-slate-700 dark:text-slate-300">
                                    Volume Discount Tiers
                                  </p>
                                  <pre className="text-[10px] whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                    {JSON.stringify(
                                      log.old_snapshot.volume_discounts,
                                      null,
                                      2,
                                    )}
                                  </pre>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-400 italic">
                                No previous configuration. This is a new record.
                              </p>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h6 className="text-sm font-bold text-emerald-600 mb-2">
                              After Change
                            </h6>

                            {log.new_snapshot ? (
                              <div className="space-y-3 text-sm">
                                <div>
                                  <p className="font-semibold mb-1 text-slate-700 dark:text-slate-300">
                                    Price List Settings
                                  </p>
                                  <pre className="text-[10px] whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                    {JSON.stringify(
                                      log.new_snapshot.price_list,
                                      null,
                                      2,
                                    )}
                                  </pre>
                                </div>

                                <div>
                                  <p className="font-semibold mb-1 text-slate-700 dark:text-slate-300">
                                    Item Pricing
                                  </p>
                                  <pre className="text-[10px] whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                    {JSON.stringify(
                                      log.new_snapshot.price_list_item,
                                      null,
                                      2,
                                    )}
                                  </pre>
                                </div>

                                <div>
                                  <p className="font-semibold mb-1 text-slate-700 dark:text-slate-300">
                                    Volume Discount Tiers
                                  </p>
                                  <pre className="text-[10px] whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                    {JSON.stringify(
                                      log.new_snapshot.volume_discounts,
                                      null,
                                      2,
                                    )}
                                  </pre>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-400 italic">
                                This configuration was deleted.
                              </p>
                            )}
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 dark:border-slate-800 p-4">
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
} */
