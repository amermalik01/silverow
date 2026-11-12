// app/components/parties/tabs/PriceOffersTab.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
// import MasterDropdown from "@/app/components/shared/MasterDropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parse, parseISO, isValid } from "date-fns";
import NumericTextInput from "@/components/ui/NumericTextInput";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";
import MasterDropdown from "../../common/MasterDropdown";

export type ItemVolumeDiscountDraft = {
  id?: string;
  min_order_qty: number | string;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT";
  discount_value: number | string;
  discounted_price: number | string;
};

export type ItemPriceOfferDraft = {
  id?: string;
  price_list_id?: string;
  price_list_item_id?: string;
  name: string;
  list_type: "SALES" | "PURCHASE";
  party_id?: string | null;
  party_name?: string;
  party_type?: "customer" | "supplier" | "";
  start_date: string;
  end_date: string;
  currency_id: string;
  offer_method: string;
  standard_price: number | string;
  offered_price: number | string;
  min_order_qty: number | string;
  max_order_qty: number | string;
  has_volume_discount: boolean;
  volume_discounts: ItemVolumeDiscountDraft[];
  is_new?: boolean;
  is_dirty?: boolean;
};

// type PriceHistoryRecord = {
//   id: string;
//   old_offered_price: number | null;
//   new_offered_price: number;
//   old_min_order_qty: number | null;
//   new_min_order_qty: number;
//   old_max_order_qty: number | null;
//   new_max_order_qty: number | null;
//   changed_at: string;
//   changed_by_name: string | null;
// };

type PriceListSnapshot = {
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
  old_snapshot: PriceListSnapshot | null;
  new_snapshot: PriceListSnapshot | null;
  changed_fields: string[];
  changed_at: string;
  changed_by_name: string | null;
};

type Props = {
  itemId: string;
  baseCurrencyId?: string;
  isReadonly?: boolean;
  priceOffers: ItemPriceOfferDraft[];
  setPriceOffers: React.Dispatch<React.SetStateAction<ItemPriceOfferDraft[]>>;
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

export default function PriceOffersTab({
  itemId,
  baseCurrencyId,
  isReadonly = false,
  priceOffers = [],
  setPriceOffers,
  onRequestEdit,
}: Props) {
  const [activeTierOfferIdx, setActiveTierOfferIdx] = useState<number | null>(
    null,
  );
  const [historyModalItem, setHistoryModalItem] = useState<{
    priceListItemId: string;
    partyName: string;
  } | null>(null);
  const [historyLogs, setHistoryLogs] = useState<PriceHistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Modal State Flags
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  const validList = Array.isArray(priceOffers) ? priceOffers : [];

  const currentYear = new Date().getFullYear();
  const defaultStartDate = `${currentYear}-01-01`;
  const defaultEndDate = `${currentYear}-12-31`;

  // Separate list into Customer (Sales) and Supplier (Purchase) tables
  const customerOffers = validList
    .map((offer, idx) => ({ offer, originalIdx: idx }))
    .filter(({ offer }) => offer.list_type === "SALES");

  const supplierOffers = validList
    .map((offer, idx) => ({ offer, originalIdx: idx }))
    .filter(({ offer }) => offer.list_type === "PURCHASE");

  const updateOfferRow = (
    originalIdx: number,
    key: keyof ItemPriceOfferDraft,
    val: unknown,
  ) => {
    onRequestEdit?.();
    setPriceOffers((prev) =>
      (prev || []).map((offer, idx) => {
        if (idx !== originalIdx) return offer;

        const updated = { ...offer, [key]: val, is_dirty: true };
        if (key === "offered_price") {
          updated.volume_discounts = (offer.volume_discounts || []).map(
            (tier) => ({
              ...tier,
              discounted_price: calculateDiscountedPrice(
                val as number | string,
                tier.discount_type,
                tier.discount_value,
              ),
            }),
          );
        }
        return updated;
      }),
    );
  };

  const removeOfferRow = (originalIdx: number) => {
    onRequestEdit?.();
    setPriceOffers((prev) =>
      (prev || []).filter((_, idx) => idx !== originalIdx),
    );
    if (activeTierOfferIdx === originalIdx) setActiveTierOfferIdx(null);
  };

  // const fetchHistory = async (priceListItemId: string, partyName: string) => {
  //   if (!priceListItemId) return;
  //   setHistoryModalItem({ priceListItemId, partyName });
  //   setIsLoadingHistory(true);
  //   try {
  //     const res = await fetch(
  //       `/api/inventory/items/price-history/${priceListItemId}`,
  //     );
  //     const data = await res.json();
  //     setHistoryLogs(data.history || []);
  //   } catch (err) {
  //     console.error("Failed to load price history", err);
  //     setHistoryLogs([]);
  //   } finally {
  //     setIsLoadingHistory(false);
  //   }
  // };

  const fetchHistory = async (priceListItemId: string, partyName: string) => {
    if (!priceListItemId) return;

    setHistoryModalItem({ priceListItemId, partyName });
    setHistoryLogs([]);
    setIsLoadingHistory(true);

    try {
      const res = await fetch(
        `/api/inventory/items/price-history/${priceListItemId}`,
      );

      const data: {
        history?: PriceHistoryRecord[];
        error?: string;
      } = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load price history.");
      }

      setHistoryLogs(data.history ?? []);
    } catch (err: unknown) {
      console.error("Failed to load price history:", err);
      setHistoryLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const formatHistoryDate = (value: string): string => {
    const date = new Date(value);

    if (!isValid(date)) {
      return value || "-";
    }

    return format(date, "dd/MM/yyyy HH:mm:ss");
  };

  const getHistoryActionClass = (
    action: PriceHistoryRecord["action"],
  ): string => {
    switch (action) {
      case "CREATE":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";

      case "UPDATE":
        return "bg-blue-100 text-blue-700 border-blue-300";

      case "DELETE":
        return "bg-red-100 text-red-700 border-red-300";

      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const getHistoryFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      name: "Price List Name",
      list_type: "Offer Type",
      offer_method: "Offer Method",
      start_date: "Valid From",
      end_date: "Valid Until",
      status: "Status",
      standard_price: "Standard Price",
      offered_price: "Offered Price",
      min_order_qty: "Minimum Order Quantity",
      max_order_qty: "Maximum Order Quantity",
      has_volume_discount: "Volume Discounts Enabled",
      volume_discounts: "Volume Discount Tiers",
      discount_type: "Discount Type",
      discount_value: "Discount Value",
      discounted_price: "Discounted Price",
      salesperson_id: "Salesperson",
      currency_id: "Currency",
      party_id: "Customer / Supplier",
    };

    const normalized = field
      .replace(/^price_list\./, "")
      .replace(/^price_list_item\./, "")
      .replace(/^volume_discounts\./, "");

    return (
      labels[normalized] ||
      normalized
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    );
  };

  const formatHistoryValue = (field: string, value: unknown): string => {
    if (value === null || value === undefined || value === "") {
      return "Not specified";
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (field === "list_type") {
      return value === "SALES" ? "Sales Offer" : "Purchase Offer";
    }

    if (field === "discount_type") {
      return value === "PERCENTAGE" ? "Percentage" : "Fixed Amount";
    }

    if (field === "has_volume_discount") {
      return value ? "Enabled" : "Disabled";
    }

    if (
      field === "standard_price" ||
      field === "offered_price" ||
      field === "discounted_price" ||
      field === "discount_value"
    ) {
      const number = Number(value);

      return Number.isFinite(number) ? number.toFixed(2) : String(value);
    }

    if (field === "min_order_qty" || field === "max_order_qty") {
      return `${Number(value).toFixed(0)} units`;
    }

    if (field === "start_date" || field === "end_date") {
      const date = new Date(String(value));

      return isValid(date) ? format(date, "dd/MM/yyyy") : String(value);
    }

    if (field === "status") {
      return String(value)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    return String(value);
  };

  const getSnapshotRows = (
    snapshot: PriceListSnapshot | null,
  ): { label: string; value: string }[] => {
    if (!snapshot) return [];

    // Only business-facing fields are displayed.
    // UUIDs and database relationship fields are deliberately excluded.
    const allowedFields = [
      "name",
      "list_type",
      "offer_method",
      "start_date",
      "end_date",
      "status",
      "standard_price",
      "offered_price",
      "min_order_qty",
      "max_order_qty",
      "has_volume_discount",
    ];

    const sections = [snapshot.price_list, snapshot.price_list_item];

    const rows: { label: string; value: string }[] = [];

    sections.forEach((section) => {
      allowedFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(section, field)) {
          const value = section[field];

          if (value === null || value === undefined) return;

          rows.push({
            label: getHistoryFieldLabel(field),
            value: formatHistoryValue(field, value),
          });
        }
      });
    });

    return rows;
  };

  const renderSnapshot = (snapshot: PriceListSnapshot | null) => {
    if (!snapshot) {
      return (
        <div className="rounded-lg border border-dashed p-4 text-center text-xs text-slate-400">
          No previous information available.
        </div>
      );
    }

    const rows = getSnapshotRows(snapshot);

    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold text-xs">
            Price Offer Details
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <div className="p-3 text-xs text-slate-400">
                No details available.
              </div>
            ) : (
              rows.map((row, index) => (
                <div
                  key={`${row.label}-${index}`}
                  className="flex justify-between gap-4 px-3 py-2 text-xs"
                >
                  <span className="text-slate-500">{row.label}</span>

                  <span className="text-right font-medium text-slate-800 dark:text-slate-200">
                    {row.value}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {snapshot.volume_discounts.length > 0 && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold text-xs">
              Volume Discount Tiers
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="p-2">Minimum Qty</th>
                    <th className="p-2">Discount Type</th>
                    <th className="p-2">Discount</th>
                    <th className="p-2">Final Price</th>
                  </tr>
                </thead>

                <tbody>
                  {snapshot.volume_discounts.map((tier, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="p-2">
                        {String(Number(tier.min_order_qty).toFixed(0) ?? "-")}{" "}
                        units
                      </td>

                      <td className="p-2">
                        {formatHistoryValue(
                          "discount_type",
                          tier.discount_type,
                        )}
                      </td>

                      <td className="p-2">
                        {formatHistoryValue(
                          "discount_value",
                          tier.discount_value,
                        )}
                        {tier.discount_type === "PERCENTAGE" ? "%" : ""}
                      </td>

                      <td className="p-2 font-semibold">
                        {formatHistoryValue(
                          "discounted_price",
                          tier.discounted_price,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getChangedFieldLabel = (field: string): string => {
    const normalized = field
      .replace(/^price_list\./, "")
      .replace(/^price_list_item\./, "");

    return getHistoryFieldLabel(normalized);
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

  const addVolumeDiscountTier = (originalIdx: number) => {
    onRequestEdit?.();
    setPriceOffers((prev) =>
      (prev || []).map((offer, idx) => {
        if (idx === originalIdx) {
          const newTier: ItemVolumeDiscountDraft = {
            min_order_qty: 5,
            discount_type: "PERCENTAGE",
            discount_value: 5,
            discounted_price: calculateDiscountedPrice(
              offer.offered_price,
              "PERCENTAGE",
              5,
            ),
          };
          return {
            ...offer,
            has_volume_discount: true,
            volume_discounts: [...(offer.volume_discounts || []), newTier],
            is_dirty: true,
          };
        }
        return offer;
      }),
    );
  };

  const updateVolumeDiscountTier = (
    originalIdx: number,
    tierIdx: number,
    key: keyof ItemVolumeDiscountDraft,
    val: unknown,
  ) => {
    onRequestEdit?.();
    setPriceOffers((prev) =>
      (prev || []).map((offer, idx) => {
        if (idx !== originalIdx) return offer;

        const updatedTiers = (offer.volume_discounts || []).map(
          (tier, tIdx) => {
            if (tIdx !== tierIdx) return tier;
            const updatedTier = { ...tier, [key]: val };
            if (key === "discount_type" || key === "discount_value") {
              updatedTier.discounted_price = calculateDiscountedPrice(
                offer.offered_price,
                updatedTier.discount_type,
                updatedTier.discount_value,
              );
            }
            return updatedTier;
          },
        );

        return { ...offer, volume_discounts: updatedTiers, is_dirty: true };
      }),
    );
  };

  const removeVolumeDiscountTier = (originalIdx: number, tierIdx: number) => {
    onRequestEdit?.();
    setPriceOffers((prev) =>
      (prev || []).map((offer, idx) => {
        if (idx === originalIdx) {
          const updatedTiers = (offer.volume_discounts || []).filter(
            (_, tIdx) => tIdx !== tierIdx,
          );
          return {
            ...offer,
            volume_discounts: updatedTiers,
            has_volume_discount: updatedTiers.length > 0,
            is_dirty: true,
          };
        }
        return offer;
      }),
    );
  };

  return (
    <div className="space-y-8 text-xs">
      {/* ================= 1. CUSTOMER PRICE OFFERS (SALES) ================= */}
      <div className="space-y-3">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Customer Price Offers (Sales)
          </h3>
          {/* {!isReadonly && ( */}
          <Button
            type="button"
            onClick={() => setIsCustomerModalOpen(true)}
            variant="add_line"
          >
            Add Customer Offer
          </Button>
          {/* )} */}
        </div>

        <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                <th className="p-3">Customer</th>
                <th className="p-3">Currency</th>
                <th className="p-3">Offered Price</th>
                <th className="p-3">Min Qty</th>
                <th className="p-3">Max Qty</th>
                <th className="p-3">Start Date</th>
                <th className="p-3">End Date</th>
                <th className="p-3 text-center">Volume Discounts</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {customerOffers.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-6 text-center text-slate-400 italic"
                  >
                    No customer price offers configured.
                  </td>
                </tr>
              ) : (
                customerOffers.map(({ offer, originalIdx }) => (
                  <tr
                    key={originalIdx}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50"
                  >
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                      {offer.party_name || "General / Global List"}
                    </td>
                    <td className="p-3 w-36">
                      <MasterDropdown
                        type="Currency"
                        value={offer.currency_id || baseCurrencyId || ""}
                        displayFormat="name"
                        valueKey="id"
                        onChange={(val) =>
                          updateOfferRow(originalIdx, "currency_id", val ?? "")
                        }
                        className="w-full border p-1 py-0.5 h-7 rounded text-xs outline-none bg-transparent"
                        disabled={isReadonly}
                      />
                    </td>
                    <td className="p-3">
                      <NumericTextInput
                        allowDecimals
                        decimalScale={2}
                        value={Number(offer.offered_price ?? 0)}
                        onChange={(val) =>
                          updateOfferRow(originalIdx, "offered_price", val)
                        }
                        disabled={isReadonly}
                        className="w-24 border rounded p-1.5 font-semibold text-right"
                      />
                    </td>
                    <td className="p-3">
                      <NumericTextInput
                        allowDecimals={false}
                        value={Number(offer.min_order_qty ?? 0)}
                        onChange={(val) =>
                          updateOfferRow(originalIdx, "min_order_qty", val)
                        }
                        disabled={isReadonly}
                        className="w-16 border rounded p-1.5 text-right"
                      />
                    </td>
                    <td className="p-3">
                      <NumericTextInput
                        allowDecimals={false}
                        value={Number(offer.max_order_qty ?? 0)}
                        onChange={(val) =>
                          updateOfferRow(originalIdx, "max_order_qty", val)
                        }
                        disabled={isReadonly}
                        className="w-16 border rounded p-1.5 text-right"
                      />
                    </td>
                    <td className="p-3">
                      <DatePicker
                        value={parseStoredDate(
                          offer.start_date || defaultStartDate,
                        )}
                        containerClassName="col-span-8"
                        disabled={isReadonly}
                        maxDate={parseStoredDate(offer.end_date)}
                        onChange={(date: Date | undefined) => {
                          if (date && isValid(date)) {
                            updateOfferRow(
                              originalIdx,
                              "start_date",
                              format(date, "yyyy-MM-dd"),
                            );
                          }
                        }}
                        className="border rounded p-1.5 bg-transparent"
                      />
                    </td>
                    <td className="p-3">
                      <DatePicker
                        value={parseStoredDate(
                          offer.end_date || defaultStartDate,
                        )}
                        containerClassName="col-span-8"
                        disabled={isReadonly}
                        minDate={parseStoredDate(offer.start_date)}
                        onChange={(date: Date | undefined) => {
                          if (date && isValid(date)) {
                            updateOfferRow(
                              originalIdx,
                              "end_date",
                              format(date, "yyyy-MM-dd"),
                            );
                          }
                        }}
                        className="border rounded p-1.5 bg-transparent"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTierOfferIdx(
                            originalIdx === activeTierOfferIdx
                              ? null
                              : originalIdx,
                          )
                        }
                        className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                          offer.has_volume_discount
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-slate-100 text-slate-600 border-slate-300"
                        }`}
                      >
                        {offer.has_volume_discount
                          ? `${offer.volume_discounts.length} Tiers`
                          : "Configure Tiers"}
                      </button>
                    </td>

                    <td className="p-3 text-right space-x-2">
                      {offer.price_list_item_id && (
                        <button
                          type="button"
                          onClick={() =>
                            fetchHistory(
                              offer.price_list_item_id!,
                              offer.party_name || "General List",
                            )
                          }
                          className="text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          History
                        </button>
                      )}
                      {!isReadonly && (
                        <button
                          type="button"
                          onClick={() => removeOfferRow(originalIdx)}
                          className="text-red-500 hover:text-red-700 font-bold px-1"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                    {/* <td className="p-3 text-right">
                      {!isReadonly && (
                        <button
                          type="button"
                          onClick={() => removeOfferRow(originalIdx)}
                          className="text-red-500 hover:text-red-700 font-bold px-2"
                        >
                          ✕
                        </button>
                      )}
                    </td> */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= 2. SUPPLIER PRICE OFFERS (PURCHASE) ================= */}
      <div className="space-y-3 pt-4">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Supplier Price Offers (Purchase)
          </h3>
          {/* {!isReadonly && ( */}
          <Button
            type="button"
            onClick={() => setIsSupplierModalOpen(true)}
            variant="add_line"
          >
            Add Supplier Offer
          </Button>
          {/* )} */}
        </div>

        <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                <th className="p-3">Supplier</th>
                <th className="p-3">Currency</th>
                <th className="p-3">Offered Cost</th>
                <th className="p-3">Min Qty</th>
                <th className="p-3">Max Qty</th>
                <th className="p-3">Start Date</th>
                <th className="p-3">End Date</th>
                <th className="p-3 text-center">Volume Discounts</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {supplierOffers.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-6 text-center text-slate-400 italic"
                  >
                    No supplier price offers configured.
                  </td>
                </tr>
              ) : (
                supplierOffers.map(({ offer, originalIdx }) => (
                  <tr
                    key={originalIdx}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50"
                  >
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                      {offer.party_name || "General / Global List"}
                    </td>
                    <td className="p-3 w-36">
                      <MasterDropdown
                        type="Currency"
                        value={offer.currency_id || baseCurrencyId || ""}
                        displayFormat="name"
                        valueKey="id"
                        onChange={(val) =>
                          updateOfferRow(originalIdx, "currency_id", val ?? "")
                        }
                        className="w-full border p-1 py-0.5 h-7 rounded text-xs outline-none bg-transparent"
                        disabled={isReadonly}
                      />
                    </td>
                    <td className="p-3">
                      <NumericTextInput
                        allowDecimals
                        decimalScale={2}
                        value={Number(offer.offered_price ?? 0)}
                        onChange={(val) =>
                          updateOfferRow(originalIdx, "offered_price", val)
                        }
                        disabled={isReadonly}
                        className="w-24 border rounded p-1.5 font-semibold text-right"
                      />
                      {/* <input
                        type="number"
                        value={offer.offered_price ?? 0}
                        disabled={isReadonly}
                        onChange={(e) =>
                          updateOfferRow(
                            originalIdx,
                            "offered_price",
                            e.target.value,
                          )
                        }
                        className="w-24 border rounded p-1.5 bg-blue-50 font-semibold text-right"
                      /> */}
                    </td>
                    <td className="p-3">
                      <NumericTextInput
                        allowDecimals={false}
                        value={Number(offer.min_order_qty ?? 0)}
                        onChange={(val) =>
                          updateOfferRow(originalIdx, "min_order_qty", val)
                        }
                        disabled={isReadonly}
                        className="w-16 border rounded p-1.5 text-right"
                      />
                      {/* <input
                        type="number"
                        value={offer.min_order_qty ?? 1}
                        disabled={isReadonly}
                        onChange={(e) =>
                          updateOfferRow(
                            originalIdx,
                            "min_order_qty",
                            e.target.value,
                          )
                        }
                        className="w-16 border rounded p-1.5 text-right"
                      /> */}
                    </td>
                    <td className="p-3">
                      <NumericTextInput
                        allowDecimals={false}
                        value={Number(offer.max_order_qty ?? 0)}
                        onChange={(val) =>
                          updateOfferRow(originalIdx, "max_order_qty", val)
                        }
                        disabled={isReadonly}
                        className="w-16 border rounded p-1.5 text-right"
                      />
                      {/* <input
                        type="number"
                        value={offer.max_order_qty ?? 100}
                        disabled={isReadonly}
                        onChange={(e) =>
                          updateOfferRow(
                            originalIdx,
                            "max_order_qty",
                            e.target.value,
                          )
                        }
                        className="w-16 border rounded p-1.5 text-right"
                      /> */}
                    </td>
                    <td className="p-3">
                      <DatePicker
                        value={parseStoredDate(
                          offer.start_date || defaultStartDate,
                        )}
                        containerClassName="col-span-8"
                        disabled={isReadonly}
                        maxDate={parseStoredDate(offer.end_date)}
                        onChange={(date: Date | undefined) => {
                          if (date && isValid(date)) {
                            updateOfferRow(
                              originalIdx,
                              "start_date",
                              format(date, "yyyy-MM-dd"),
                            );
                          }
                        }}
                        className="border rounded p-1.5 bg-transparent"
                      />
                    </td>
                    <td className="p-3">
                      <DatePicker
                        value={parseStoredDate(
                          offer.end_date || defaultStartDate,
                        )}
                        containerClassName="col-span-8"
                        disabled={isReadonly}
                        minDate={parseStoredDate(offer.start_date)}
                        onChange={(date: Date | undefined) => {
                          if (date && isValid(date)) {
                            updateOfferRow(
                              originalIdx,
                              "end_date",
                              format(date, "yyyy-MM-dd"),
                            );
                          }
                        }}
                        className="border rounded p-1.5 bg-transparent"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTierOfferIdx(
                            originalIdx === activeTierOfferIdx
                              ? null
                              : originalIdx,
                          )
                        }
                        className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                          offer.has_volume_discount
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-slate-100 text-slate-600 border-slate-300"
                        }`}
                      >
                        {offer.has_volume_discount
                          ? `${offer.volume_discounts.length} Tiers`
                          : "Configure Tiers"}
                      </button>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {offer.price_list_item_id && (
                        <button
                          type="button"
                          onClick={() =>
                            fetchHistory(
                              offer.price_list_item_id!,
                              offer.party_name || "General List",
                            )
                          }
                          className="text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          History
                        </button>
                      )}
                      {!isReadonly && (
                        <button
                          type="button"
                          onClick={() => removeOfferRow(originalIdx)}
                          className="text-red-500 hover:text-red-700 font-bold px-1"
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
      </div>

      {/* ================= 3. VOLUME DISCOUNT TIERS DRAWER/SECTION ================= */}
      {activeTierOfferIdx !== null && validList[activeTierOfferIdx] && (
        <div className="p-4 rounded border border-blue-200 dark:border-blue-900 bg-blue-50/20 dark:bg-slate-900 space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="font-bold text-blue-800 dark:text-blue-300">
              Volume Discount Tiers for &quot;
              {validList[activeTierOfferIdx].party_name || "General List"}&quot;
            </h5>
            {!isReadonly && (
              <Button
                type="button"
                onClick={() => addVolumeDiscountTier(activeTierOfferIdx)}
                variant="add_line"
              >
                Add Tier
              </Button>
            )}
          </div>

          <table className="w-full text-left border-collapse bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                <th className="p-2.5">Min Order Qty</th>
                <th className="p-2.5">Discount Type</th>
                <th className="p-2.5">Discount Value</th>
                <th className="p-2.5">Discounted Price</th>
                <th className="p-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {!validList[activeTierOfferIdx].volume_discounts ||
              validList[activeTierOfferIdx].volume_discounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-slate-400 italic"
                  >
                    No volume discount tiers specified.
                  </td>
                </tr>
              ) : (
                validList[activeTierOfferIdx].volume_discounts.map(
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
                            updateVolumeDiscountTier(
                              activeTierOfferIdx,
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
                            updateVolumeDiscountTier(
                              activeTierOfferIdx,
                              tierIdx,
                              "discount_type",
                              e.target.value,
                            )
                          }
                          className="border rounded p-1 w-full text-xs"
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
                            updateVolumeDiscountTier(
                              activeTierOfferIdx,
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
                          readOnly
                          className="w-24 border rounded p-1 text-xs bg-slate-50"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        {!isReadonly && (
                          <button
                            type="button"
                            onClick={() =>
                              removeVolumeDiscountTier(
                                activeTierOfferIdx,
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

      {/* ================= HISTORY MODAL ================= */}
      {/* ================= COMPLETE PRICE HISTORY MODAL ================= */}

      {historyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 p-5">
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Price Offer History
                </h4>

                <p className="text-xs text-slate-500 mt-1">
                  {historyModalItem.partyName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                className="text-slate-500 hover:text-red-500 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4">
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
                    {/* Event Header */}
                    <div className="flex flex-wrap justify-between items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/60">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 rounded border text-[10px] font-bold ${getHistoryActionClass(
                            log.action,
                          )}`}
                        >
                          {/* {log.action} */}
                          {log.action === "CREATE"
                            ? "Created"
                            : log.action === "UPDATE"
                              ? "Updated"
                              : "Deleted"}
                        </span>

                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {log.changed_by_name || "System User"}
                        </span>
                      </div>

                      <span className="text-xs text-slate-500">
                        {formatHistoryDate(log.changed_at)}
                      </span>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Changed Fields */}
                      <div>
                        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                          Changed Fields
                        </h5>

                        {log.changed_fields.map((field, index) => (
                          <span
                            key={`${log.id}-${field}-${index}`}
                            className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px]"
                          >
                            {getChangedFieldLabel(field)}
                          </span>
                        ))}

                        {/* {log.changed_fields?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {log.changed_fields.map((field, index) => (
                              <span
                                key={`${log.id}-${field}-${index}`}
                                className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px]"
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            No individual field changes recorded.
                          </span>
                        )} */}
                      </div>

                      {/* Before / After */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-red-600 mb-2">
                            Before
                          </h5>

                          <div className="space-y-2">
                            {renderSnapshot(log.old_snapshot)}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-emerald-600 mb-2">
                            After
                          </h5>

                          <div className="space-y-2">
                            {renderSnapshot(log.new_snapshot)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
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

      {/* Customer Lookup Modal with Multiple Select */}
      {isCustomerModalOpen && (
        <CustomerLookupModal
          open={isCustomerModalOpen}
          multiple={true}
          onClose={() => setIsCustomerModalOpen(false)}
          onSelectMultiple={(customers: CustomerLookupItem[]) => {
            if (customers && customers.length > 0) {
              onRequestEdit?.();
              const newOffers: ItemPriceOfferDraft[] = customers.map(
                (customer) => ({
                  name: `Customer Price Offer - ${customer.name}`,
                  list_type: "SALES",
                  party_id: customer.id,
                  party_name: `${customer.customer_code ? customer.customer_code + " - " : ""}${customer.name}`,
                  party_type: "customer",
                  start_date: defaultStartDate,
                  end_date: defaultEndDate,
                  currency_id: customer.currency_id || baseCurrencyId || "",
                  offer_method: "Phone",
                  standard_price: 0,
                  offered_price: 0,
                  min_order_qty: 1,
                  max_order_qty: 100,
                  has_volume_discount: false,
                  volume_discounts: [],
                  is_new: true,
                  is_dirty: true,
                }),
              );

              setPriceOffers((prev) => [...(prev || []), ...newOffers]);
            }
            setIsCustomerModalOpen(false);
          }}
        />
      )}

      {/* Supplier Lookup Modal with Multiple Select */}
      {isSupplierModalOpen && (
        <SupplierLookupModal
          open={isSupplierModalOpen}
          multiple={true}
          onClose={() => setIsSupplierModalOpen(false)}
          onSelectMultiple={(suppliers: SupplierLookupItem[]) => {
            if (suppliers && suppliers.length > 0) {
              onRequestEdit?.();
              const newOffers: ItemPriceOfferDraft[] = suppliers.map(
                (supplier) => ({
                  name: `Supplier Price Offer - ${supplier.name}`,
                  list_type: "PURCHASE",
                  party_id: supplier.id,
                  party_name: `${supplier.supplier_code ? supplier.supplier_code + " - " : ""}${supplier.name}`,
                  party_type: "supplier",
                  start_date: defaultStartDate,
                  end_date: defaultEndDate,
                  currency_id: supplier.currency_id || baseCurrencyId || "",
                  offer_method: "Phone",
                  standard_price: 0,
                  offered_price: 0,
                  min_order_qty: 1,
                  max_order_qty: 100,
                  has_volume_discount: false,
                  volume_discounts: [],
                  is_new: true,
                  is_dirty: true,
                }),
              );

              setPriceOffers((prev) => [...(prev || []), ...newOffers]);
            }
            setIsSupplierModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
/* {historyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center border-b pb-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Price Update History — {historyModalItem.partyName}
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
      )} */
