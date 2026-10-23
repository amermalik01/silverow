// app/components/inventory/items/tabs/PriceOffersTab.tsx

"use client";

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
      offer_method: "Phone",//"Fixed Price",
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
      {/* Sub-Tabs Selector Header */}
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
          {/* Main Configuration Meta Card */}
          <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-3">
              {/* List Name */}
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

              {/* List Type (Sales / Purchase) */}
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

              {/* Target Party Assignment via Customer/Supplier Modal */}
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

              {/* Offer Method */}
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Offer Method
                </label>
                <div className="col-span-2">
                  <select
                    value={activeOffer.offer_method || "Phone"}// "Fixed Price"
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateActiveOffer("offer_method", e.target.value)
                    }
                    className="w-full border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-900"
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
          </div>

          {/* Pricing Matrix for Active Offer */}
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

          {/* Volume Discount Tiers Sub-Matrix */}
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
                          {/* <input
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
                          /> */}
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

      {/* Customer Lookup Modal */}
      {isCustomerModalOpen && (
        <CustomerLookupModal
          open={isCustomerModalOpen}
          multiple={false}
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

      {/* Supplier Lookup Modal */}
      {isSupplierModalOpen && (
        <SupplierLookupModal
          open={isSupplierModalOpen}
          multiple={false}
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
}
