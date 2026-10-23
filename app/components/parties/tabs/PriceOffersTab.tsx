// app/components/inventory/items/tabs/PriceOffersTab.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";

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

type Props = {
  itemId: string;
  baseCurrencyId?: string;
  isReadonly?: boolean;
  priceOffers: ItemPriceOfferDraft[];
  setPriceOffers: React.Dispatch<React.SetStateAction<ItemPriceOfferDraft[]>>;
  onRequestEdit?: () => void;
};

export default function PriceOffersTab({
  itemId,
  baseCurrencyId,
  isReadonly = false,
  priceOffers = [],
  setPriceOffers,
  onRequestEdit,
}: Props) {
  const [activeTierOfferIdx, setActiveTierOfferIdx] = useState<number | null>(null);

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

  const updateOfferRow = (originalIdx: number, key: keyof ItemPriceOfferDraft, val: unknown) => {
    onRequestEdit?.();
    setPriceOffers((prev) =>
      (prev || []).map((offer, idx) => {
        if (idx !== originalIdx) return offer;

        const updated = { ...offer, [key]: val, is_dirty: true };
        if (key === "offered_price") {
          updated.volume_discounts = (offer.volume_discounts || []).map((tier) => ({
            ...tier,
            discounted_price: calculateDiscountedPrice(
              val as number | string,
              tier.discount_type,
              tier.discount_value
            ),
          }));
        }
        return updated;
      })
    );
  };

  const removeOfferRow = (originalIdx: number) => {
    onRequestEdit?.();
    setPriceOffers((prev) => (prev || []).filter((_, idx) => idx !== originalIdx));
    if (activeTierOfferIdx === originalIdx) setActiveTierOfferIdx(null);
  };

  const calculateDiscountedPrice = (
    basePrice: number | string,
    discountType: "PERCENTAGE" | "FIXED_AMOUNT",
    discountValue: number | string,
  ): number => {
    const price = Number(basePrice);
    const discount = Number(discountValue);

    if (!Number.isFinite(price) || !Number.isFinite(discount) || price < 0 || discount < 0) {
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
            discounted_price: calculateDiscountedPrice(offer.offered_price, "PERCENTAGE", 5),
          };
          return {
            ...offer,
            has_volume_discount: true,
            volume_discounts: [...(offer.volume_discounts || []), newTier],
            is_dirty: true,
          };
        }
        return offer;
      })
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

        const updatedTiers = (offer.volume_discounts || []).map((tier, tIdx) => {
          if (tIdx !== tierIdx) return tier;
          const updatedTier = { ...tier, [key]: val };
          if (key === "discount_type" || key === "discount_value") {
            updatedTier.discounted_price = calculateDiscountedPrice(
              offer.offered_price,
              updatedTier.discount_type,
              updatedTier.discount_value
            );
          }
          return updatedTier;
        });

        return { ...offer, volume_discounts: updatedTiers, is_dirty: true };
      })
    );
  };

  const removeVolumeDiscountTier = (originalIdx: number, tierIdx: number) => {
    onRequestEdit?.();
    setPriceOffers((prev) =>
      (prev || []).map((offer, idx) => {
        if (idx === originalIdx) {
          const updatedTiers = (offer.volume_discounts || []).filter((_, tIdx) => tIdx !== tierIdx);
          return {
            ...offer,
            volume_discounts: updatedTiers,
            has_volume_discount: updatedTiers.length > 0,
            is_dirty: true,
          };
        }
        return offer;
      })
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
          {!isReadonly && (
            <Button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              variant="add_line"
            >
              Add Customer Offer
            </Button>
          )}
        </div>

        <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                <th className="p-3">Customer</th>
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
                  <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                    No customer price offers configured.
                  </td>
                </tr>
              ) : (
                customerOffers.map(({ offer, originalIdx }) => (
                  <tr key={originalIdx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                      {offer.party_name || "General / Global List"}
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={offer.offered_price ?? 0}
                        disabled={isReadonly}
                        onChange={(e) => updateOfferRow(originalIdx, "offered_price", e.target.value)}
                        className="w-24 border rounded p-1.5 bg-blue-50 font-semibold text-right"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={offer.min_order_qty ?? 1}
                        disabled={isReadonly}
                        onChange={(e) => updateOfferRow(originalIdx, "min_order_qty", e.target.value)}
                        className="w-16 border rounded p-1.5 text-right"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={offer.max_order_qty ?? 100}
                        disabled={isReadonly}
                        onChange={(e) => updateOfferRow(originalIdx, "max_order_qty", e.target.value)}
                        className="w-16 border rounded p-1.5 text-right"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="date"
                        value={offer.start_date || defaultStartDate}
                        disabled={isReadonly}
                        onChange={(e) => updateOfferRow(originalIdx, "start_date", e.target.value)}
                        className="border rounded p-1.5 bg-transparent"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="date"
                        value={offer.end_date || defaultEndDate}
                        disabled={isReadonly}
                        onChange={(e) => updateOfferRow(originalIdx, "end_date", e.target.value)}
                        className="border rounded p-1.5 bg-transparent"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveTierOfferIdx(originalIdx === activeTierOfferIdx ? null : originalIdx)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                          offer.has_volume_discount
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-slate-100 text-slate-600 border-slate-300"
                        }`}
                      >
                        {offer.has_volume_discount ? `${offer.volume_discounts.length} Tiers` : "Configure Tiers"}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      {!isReadonly && (
                        <button
                          type="button"
                          onClick={() => removeOfferRow(originalIdx)}
                          className="text-red-500 hover:text-red-700 font-bold px-2"
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

      {/* ================= 2. SUPPLIER PRICE OFFERS (PURCHASE) ================= */}
      <div className="space-y-3 pt-4">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Supplier Price Offers (Purchase)
          </h3>
          {!isReadonly && (
            <Button
              type="button"
              onClick={() => setIsSupplierModalOpen(true)}
              variant="add_line"
            >
              Add Supplier Offer
            </Button>
          )}
        </div>

        <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                <th className="p-3">Supplier</th>
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
                  <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                    No supplier price offers configured.
                  </td>
                </tr>
              ) : (
                supplierOffers.map(({ offer, originalIdx }) => (
                  <tr key={originalIdx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                      {offer.party_name || "General / Global List"}
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={offer.offered_price ?? 0}
                        disabled={isReadonly}
                        onChange={(e) => updateOfferRow(originalIdx, "offered_price", e.target.value)}
                        className="w-24 border rounded p-1.5 bg-blue-50 font-semibold text-right"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={offer.min_order_qty ?? 1}
                        disabled={isReadonly}
                        onChange={(e) => updateOfferRow(originalIdx, "min_order_qty", e.target.value)}
                        className="w-16 border rounded p-1.5 text-right"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={offer.max_order_qty ?? 100}
                        disabled={isReadonly}
                        onChange={(e) => updateOfferRow(originalIdx, "max_order_qty", e.target.value)}
                        className="w-16 border rounded p-1.5 text-right"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="date"
                        value={offer.start_date || defaultStartDate}
                        disabled={isReadonly}
                        onChange={(e) => updateOfferRow(originalIdx, "start_date", e.target.value)}
                        className="border rounded p-1.5 bg-transparent"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="date"
                        value={offer.end_date || defaultEndDate}
                        disabled={isReadonly}
                        onChange={(e) => updateOfferRow(originalIdx, "end_date", e.target.value)}
                        className="border rounded p-1.5 bg-transparent"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveTierOfferIdx(originalIdx === activeTierOfferIdx ? null : originalIdx)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                          offer.has_volume_discount
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-slate-100 text-slate-600 border-slate-300"
                        }`}
                      >
                        {offer.has_volume_discount ? `${offer.volume_discounts.length} Tiers` : "Configure Tiers"}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      {!isReadonly && (
                        <button
                          type="button"
                          onClick={() => removeOfferRow(originalIdx)}
                          className="text-red-500 hover:text-red-700 font-bold px-2"
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
              Volume Discount Tiers for &quot;{validList[activeTierOfferIdx].party_name || "General List"}&quot;
            </h5>
            {!isReadonly && (
              <Button type="button" onClick={() => addVolumeDiscountTier(activeTierOfferIdx)} variant="add_line">
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
                  <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                    No volume discount tiers specified.
                  </td>
                </tr>
              ) : (
                validList[activeTierOfferIdx].volume_discounts.map((tier, tierIdx) => (
                  <tr key={tierIdx} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="p-2.5">
                      <input
                        type="number"
                        value={tier.min_order_qty}
                        disabled={isReadonly}
                        onChange={(e) => updateVolumeDiscountTier(activeTierOfferIdx, tierIdx, "min_order_qty", e.target.value)}
                        className="w-24 border rounded p-1 text-xs"
                      />
                    </td>
                    <td className="p-2.5">
                      <select
                        value={tier.discount_type}
                        disabled={isReadonly}
                        onChange={(e) => updateVolumeDiscountTier(activeTierOfferIdx, tierIdx, "discount_type", e.target.value)}
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
                        onChange={(e) => updateVolumeDiscountTier(activeTierOfferIdx, tierIdx, "discount_value", e.target.value)}
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
                          onClick={() => removeVolumeDiscountTier(activeTierOfferIdx, tierIdx)}
                          className="text-slate-400 hover:text-red-600 font-bold px-2"
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
              const newOffers: ItemPriceOfferDraft[] = customers.map((customer) => ({
                name: `Customer Price Offer - ${customer.name}`,
                list_type: "SALES",
                party_id: customer.id,
                party_name: `${customer.customer_code ? customer.customer_code + " - " : ""}${customer.name}`,
                party_type: "customer",
                start_date: defaultStartDate,
                end_date: defaultEndDate,
                currency_id: baseCurrencyId || "",
                offer_method: "Phone",
                standard_price: 0,
                offered_price: 0,
                min_order_qty: 1,
                max_order_qty: 100,
                has_volume_discount: false,
                volume_discounts: [],
                is_new: true,
                is_dirty: true,
              }));

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
              const newOffers: ItemPriceOfferDraft[] = suppliers.map((supplier) => ({
                name: `Supplier Price Offer - ${supplier.name}`,
                list_type: "PURCHASE",
                party_id: supplier.id,
                party_name: `${supplier.supplier_code ? supplier.supplier_code + " - " : ""}${supplier.name}`,
                party_type: "supplier",
                start_date: defaultStartDate,
                end_date: defaultEndDate,
                currency_id: baseCurrencyId || "",
                offer_method: "Phone",
                standard_price: 0,
                offered_price: 0,
                min_order_qty: 1,
                max_order_qty: 100,
                has_volume_discount: false,
                volume_discounts: [],
                is_new: true,
                is_dirty: true,
              }));

              setPriceOffers((prev) => [...(prev || []), ...newOffers]);
            }
            setIsSupplierModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* "use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";

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
  name: string; // price list name
  price_list_name?: string;
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

type Props = {
  itemId: string;
  baseCurrencyId?: string;
  isReadonly?: boolean;
  priceOffers: ItemPriceOfferDraft[];
  setPriceOffers: React.Dispatch<React.SetStateAction<ItemPriceOfferDraft[]>>;
  onRequestEdit?: () => void;
};

export default function PriceOffersTab({
  itemId,
  baseCurrencyId,
  isReadonly = false,
  priceOffers = [], // Safeguard default
  setPriceOffers,
  onRequestEdit,
}: Props) {
  const [activeOfferIdx, setActiveOfferIdx] = useState<number | null>(0);

  // Separate Modal State Flags for Customer & Supplier
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [partyModalTargetIdx, setPartyModalTargetIdx] = useState<number | null>(
    null,
  );

  // Safe Index Resolution
  const validList = Array.isArray(priceOffers) ? priceOffers : [];
  const safeIdx =
    activeOfferIdx !== null && validList[activeOfferIdx] ? activeOfferIdx : 0;
  const activeOffer = validList.length > 0 ? validList[safeIdx] || null : null;

  // Add a new Price Offer list assignment for this item
  const addPriceOffer = () => {
    onRequestEdit?.();
    const newOffer: ItemPriceOfferDraft = {
      name: "Custom Price Offer List",
      list_type: "SALES", // Defaulting to SALES (Customer)
      party_id: null,
      party_name: "General / Global List",
      party_type: "customer",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      currency_id: baseCurrencyId || "",
      offer_method: "Phone", //"Fixed Price",
      standard_price: 0,
      offered_price: 0,
      min_order_qty: 1,
      max_order_qty: 100,
      has_volume_discount: false,
      volume_discounts: [],
      is_new: true,
      is_dirty: true,
    };
    setPriceOffers((prev) => [...(prev || []), newOffer]);
    setActiveOfferIdx(validList.length);
  };

  // const updateActiveOffer = (key: keyof ItemPriceOfferDraft, val: unknown) => {
  //   onRequestEdit?.();
  //   setPriceOffers((prev) =>
  //     (prev || []).map((offer, idx) =>
  //       idx === safeIdx ? { ...offer, [key]: val, is_dirty: true } : offer,
  //     ),
  //   );
  // };

  const calculateDiscountedPrice = (
    basePrice: number | string,
    discountType: "PERCENTAGE" | "FIXED_AMOUNT",
    discountValue: number | string,
  ): number => {
    const price = Number(basePrice);
    const discount = Number(discountValue);

    if (!Number.isFinite(price) || !Number.isFinite(discount)) {
      return 0;
    }

    if (price < 0 || discount < 0) {
      return 0;
    }

    const discountedPrice =
      discountType === "PERCENTAGE"
        ? price - (price * discount) / 100
        : price - discount;

    return Math.round(Math.max(0, discountedPrice) * 100) / 100;
  };

  const updateActiveOffer = (key: keyof ItemPriceOfferDraft, val: unknown) => {
    onRequestEdit?.();

    setPriceOffers((prev) =>
      (prev || []).map((offer, idx) => {
        if (idx !== safeIdx) return offer;

        const updatedOffer = {
          ...offer,
          [key]: val,
          is_dirty: true,
        };

        if (key === "offered_price") {
          updatedOffer.volume_discounts = (offer.volume_discounts || []).map(
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

        return updatedOffer;
      }),
    );
  };

  const removeOfferRow = (index: number) => {
    onRequestEdit?.();
    setPriceOffers((prev) => (prev || []).filter((_, idx) => idx !== index));
    setActiveOfferIdx(0);
  };

  const addVolumeDiscountTier = (offerIdx: number) => {
    onRequestEdit?.();
    setPriceOffers((prev) =>
      (prev || []).map((offer, idx) => {
        if (idx === offerIdx) {
          const newTier: ItemVolumeDiscountDraft = {
            min_order_qty: 5,
            discount_type: "PERCENTAGE",
            discount_value: 5,
            discounted_price: 0,
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
    offerIdx: number,
    tierIdx: number,
    key: keyof ItemVolumeDiscountDraft,
    val: unknown,
  ) => {
    onRequestEdit?.();

    setPriceOffers((prev) =>
      (prev || []).map((offer, idx) => {
        if (idx !== offerIdx) return offer;

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

        return {
          ...offer,
          volume_discounts: updatedTiers,
          is_dirty: true,
        };
      }),
    );
  };

  const removeVolumeDiscountTier = (offerIdx: number, tierIdx: number) => {
    onRequestEdit?.();
    setPriceOffers((prev) =>
      (prev || []).map((offer, idx) => {
        if (idx === offerIdx) {
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
    <div className="space-y-4 text-xs">
 
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {validList.map((offer, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveOfferIdx(idx)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t transition-colors ${
                safeIdx === idx
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {offer?.name || `Price Offer ${idx + 1}`}
            </button>
          ))}
        </div>
        {!isReadonly && (
          <Button type="button" onClick={addPriceOffer} variant="add_line">
            Assign Price Offer
          </Button>
        )}
      </div>

      {validList.length === 0 || activeOffer === null ? (
        <div className="p-8 text-center border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400">
          No customer or supplier price offers configured for this item yet.
        </div>
      ) : (
        <div className="space-y-6">

          <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-3">

              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Offer List Name <span className="text-red-500">*</span>
                </label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={activeOffer.name || ""}
                    disabled={isReadonly}
                    onChange={(e) => updateActiveOffer("name", e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>


              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  List Type
                </label>
                <div className="col-span-2">
                  <select
                    value={activeOffer.list_type || "SALES"}
                    disabled={isReadonly}
                    onChange={(e) => {
                      const newType = e.target.value as "SALES" | "PURCHASE";
                      updateActiveOffer("list_type", newType);
                      updateActiveOffer("party_id", null);
                      updateActiveOffer("party_name", "General / Global List");
                      updateActiveOffer(
                        "party_type",
                        newType === "SALES" ? "customer" : "supplier",
                      );
                    }}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-900"
                  >
                    <option value="SALES">Sales Price List (Customer)</option>
                    <option value="PURCHASE">
                      Purchase Price List (Supplier)
                    </option>
                  </select>
                </div>
              </div>


              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Target Party
                </label>
                <div className="col-span-2 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    value={activeOffer.party_name || "General / Global List"}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded p-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  />
                  {!isReadonly && (
                    <button
                      type="button"
                      onClick={() => {
                        setPartyModalTargetIdx(safeIdx);
                        if (activeOffer.list_type === "SALES") {
                          setIsCustomerModalOpen(true);
                        } else {
                          setIsSupplierModalOpen(true);
                        }
                      }}
                      className="px-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300"
                    >
                      <Icon icon="tabler:search" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

 
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Offer Method
                </label>
                <div className="col-span-2">
                  <select
                    value={activeOffer.offer_method || "Phone"} // "Fixed Price"
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateActiveOffer("offer_method", e.target.value)
                    }
                    className="w-full border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-900"
                  >
                    <option value="Phone">Phone</option>
                    <option value="Email">Email</option>

                  </select>
                </div>
              </div>
            </div>
          </div>

 
          <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-800 dark:text-slate-200">
                Item Pricing Rules & Quantity Thresholds
              </h4>
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() => removeOfferRow(safeIdx)}
                  className="text-red-600 hover:text-red-700 font-semibold"
                >
                  Remove Offer Assignment
                </button>
              )}
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/20">
                  <th className="p-3">Standard Reference Price</th>
                  <th className="p-3">Custom Offered Price</th>
                  <th className="p-3">Min Order Qty</th>
                  <th className="p-3">Max Order Qty</th>
                  <th className="p-3 text-center">Volume Discount Tiers</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 text-slate-600 dark:text-slate-400 font-medium">
                    {activeOffer.standard_price || 0}
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={activeOffer.offered_price ?? 0}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateActiveOffer("offered_price", e.target.value)
                      }
                      className="w-28 border border-slate-300 dark:border-slate-700 rounded p-1.5 text-xs bg-blue-50 font-semibold text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={activeOffer.min_order_qty ?? 1}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateActiveOffer("min_order_qty", e.target.value)
                      }
                      className="w-20 border border-slate-300 dark:border-slate-700 rounded p-1.5 text-xs bg-transparent text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={activeOffer.max_order_qty ?? 100}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateActiveOffer("max_order_qty", e.target.value)
                      }
                      className="w-20 border border-slate-300 dark:border-slate-700 rounded p-1.5 text-xs bg-transparent text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!activeOffer.has_volume_discount}
                      disabled={isReadonly}
                      onChange={(e) => {
                        updateActiveOffer(
                          "has_volume_discount",
                          e.target.checked,
                        );
                        if (
                          e.target.checked &&
                          (!activeOffer.volume_discounts ||
                            activeOffer.volume_discounts.length === 0)
                        ) {
                          addVolumeDiscountTier(safeIdx);
                        }
                      }}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>


          {activeOffer.has_volume_discount && (
            <div className="p-4 rounded border border-blue-200 dark:border-blue-900 bg-blue-50/20 dark:bg-slate-900 space-y-3">
              <div className="flex justify-between items-center">
                <h5 className="font-bold text-blue-800 dark:text-blue-300">
                  Volume Discount Tiers for &quot;{activeOffer.name}&quot;
                </h5>
                {!isReadonly && (
                  <Button
                    type="button"
                    onClick={() => addVolumeDiscountTier(safeIdx)}
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
                  {!activeOffer.volume_discounts ||
                  activeOffer.volume_discounts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-4 text-center text-slate-400 italic"
                      >
                        No volume discount tiers specified.
                      </td>
                    </tr>
                  ) : (
                    activeOffer.volume_discounts.map((tier, tierIdx) => (
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
                                safeIdx,
                                tierIdx,
                                "min_order_qty",
                                e.target.value,
                              )
                            }
                            className="w-24 border border-slate-300 dark:border-slate-700 rounded p-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={tier.discount_type}
                            disabled={isReadonly}
                            onChange={(e) =>
                              updateVolumeDiscountTier(
                                safeIdx,
                                tierIdx,
                                "discount_type",
                                e.target.value,
                              )
                            }
                            className="border border-slate-300 dark:border-slate-700 rounded p-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
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
                                safeIdx,
                                tierIdx,
                                "discount_value",
                                e.target.value,
                              )
                            }
                            className="w-24 border border-slate-300 dark:border-slate-700 rounded p-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="p-2.5 font-semibold text-emerald-600">
                          <input
                            type="number"
                            value={tier.discounted_price}
                            readOnly
                            className="w-24 border border-slate-300 dark:border-slate-700 rounded p-1 text-xs bg-slate-50 text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          {!isReadonly && (
                            <button
                              type="button"
                              onClick={() =>
                                removeVolumeDiscountTier(safeIdx, tierIdx)
                              }
                              className="text-slate-400 hover:text-red-600 font-bold px-2"
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
          )}
        </div>
      )}


      {isCustomerModalOpen && (
        <CustomerLookupModal
          open={isCustomerModalOpen}
          multiple={true}
          onClose={() => {
            setIsCustomerModalOpen(false);
            setPartyModalTargetIdx(null);
          }}
          onSelectMultiple={(customers: CustomerLookupItem[]) => {
            if (
              customers &&
              customers.length > 0 &&
              partyModalTargetIdx !== null
            ) {
              const selectedCustomer = customers[0];
              onRequestEdit?.();
              setPriceOffers((prev) =>
                (prev || []).map((offer, idx) => {
                  if (idx === partyModalTargetIdx) {
                    return {
                      ...offer,
                      party_id: selectedCustomer.id,
                      party_name: selectedCustomer.name,
                      party_type: "customer",
                      is_dirty: true,
                    };
                  }
                  return offer;
                }),
              );
            }
            setIsCustomerModalOpen(false);
            setPartyModalTargetIdx(null);
          }}
        />
      )}


      {isSupplierModalOpen && (
        <SupplierLookupModal
          open={isSupplierModalOpen}
          multiple={true}
          onClose={() => {
            setIsSupplierModalOpen(false);
            setPartyModalTargetIdx(null);
          }}
          onSelectMultiple={(suppliers: SupplierLookupItem[]) => {
            if (
              suppliers &&
              suppliers.length > 0 &&
              partyModalTargetIdx !== null
            ) {
              const selectedSupplier = suppliers[0];
              onRequestEdit?.();
              setPriceOffers((prev) =>
                (prev || []).map((offer, idx) => {
                  if (idx === partyModalTargetIdx) {
                    return {
                      ...offer,
                      party_id: selectedSupplier.id,
                      party_name: selectedSupplier.name,
                      party_type: "supplier",
                      is_dirty: true,
                    };
                  }
                  return offer;
                }),
              );
            }
            setIsSupplierModalOpen(false);
            setPartyModalTargetIdx(null);
          }}
        />
      )}
    </div>
  );
} */

// const updateVolumeDiscountTier = (
//   offerIdx: number,
//   tierIdx: number,
//   key: keyof ItemVolumeDiscountDraft,
//   val: unknown,
// ) => {
//   onRequestEdit?.();
//   setPriceOffers((prev) =>
//     (prev || []).map((offer, idx) => {
//       if (idx === offerIdx) {
//         const updatedTiers = (offer.volume_discounts || []).map(
//           (tier, tIdx) => (tIdx === tierIdx ? { ...tier, [key]: val } : tier),
//         );
//         return { ...offer, volume_discounts: updatedTiers, is_dirty: true };
//       }
//       return offer;
//     }),
//   );
// };

  /* <input
        type="number"
        value={tier.discounted_price}
        disabled={isReadonly}
        onChange={(e) =>
          updateVolumeDiscountTier(
            safeIdx,
            tierIdx,
            "discounted_price",
            e.target.value,
          )
        }
        className="w-24 border border-slate-300 dark:border-slate-700 rounded p-1 text-xs bg-slate-50 text-slate-900 dark:text-white"
      /> */

