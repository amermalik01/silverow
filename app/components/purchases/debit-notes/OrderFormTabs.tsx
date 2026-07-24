// app/components/purchases/debit-notes/OrderFormTabs.tsx

import React from "react";
import { Icon } from "@iconify/react";
import { DebitNote, DebitNoteAddress, DebitNoteLine } from "@/types/debit-note";

interface Address {
  name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  exchange_rate: number;
}

interface CurrencyConfig {
  currency_id: string;
  exchange_rate: number;
}

interface OrderFormTabsProps {
  activeTab: "general" | "invoicing" | "shipping";
  note: Partial<DebitNote>;
  primaryAddress: Address;
  setPrimaryAddress: React.Dispatch<React.SetStateAction<Address>>;
  billingAddress: Address;
  setBillingAddress: React.Dispatch<React.SetStateAction<Address>>;
  shippingAddress: Address;
  setShippingAddress: React.Dispatch<React.SetStateAction<Address>>;
  currencyConfig: CurrencyConfig;
  setCurrencyConfig: React.Dispatch<React.SetStateAction<CurrencyConfig>>;
  currencies: Currency[];
  updateField: <K extends keyof DebitNote>(
    field: K,
    value: DebitNote[K],
  ) => void;
  setSupplierModalOpen: (open: boolean) => void;
  labelStyle?: string;
  inputStyle?: string;
}

export const OrderFormTabs: React.FC<OrderFormTabsProps> = ({
  activeTab,
  note,
  primaryAddress,
  setPrimaryAddress,
  billingAddress,
  setBillingAddress,
  shippingAddress,
  setShippingAddress,
  currencyConfig,
  setCurrencyConfig,
  currencies,
  updateField,
  setSupplierModalOpen,
  labelStyle = "text-xs font-medium text-slate-600 dark:text-slate-400 self-center",
  inputStyle = "w-full text-xs px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200",
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm w-full">
      {/* ---------------- GENERAL TAB ---------------- */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 space-x-2">
          {/* Column 1 */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Debit Note No.</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={note.debit_note_no || ""}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Supplier No. *</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  readOnly
                  className={`${inputStyle} font-mono`}
                  value={note.supplier_no || "Click Select..."}
                />
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(true)}
                  className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:search" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Supplier Name</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={note.supplier_name || ""}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label
                className={labelStyle}
                title="Warehouse Booking Reference No."
              >
                Linked PO
              </label>
              <input
                type="text"
                className={inputStyle}
                value={note.linked_po || ""}
                onChange={(e) => updateField("linked_po", e.target.value)}
              />
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Address Line 1</label>
              <input
                type="text"
                className={inputStyle}
                value={primaryAddress.address_1 || ""}
                onChange={(e) =>
                  setPrimaryAddress({
                    ...primaryAddress,
                    address_1: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Address Line 2</label>
              <input
                type="text"
                className={inputStyle}
                value={primaryAddress.address_2 || ""}
                onChange={(e) =>
                  setPrimaryAddress({
                    ...primaryAddress,
                    address_2: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>City</label>
              <input
                type="text"
                className={inputStyle}
                value={primaryAddress.city || ""}
                onChange={(e) =>
                  setPrimaryAddress({ ...primaryAddress, city: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>County</label>
              <input
                type="text"
                className={inputStyle}
                value={primaryAddress.county || ""}
                onChange={(e) =>
                  setPrimaryAddress({
                    ...primaryAddress,
                    county: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Postcode/Co.</label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="text"
                  placeholder="Postcode"
                  className={inputStyle}
                  value={primaryAddress.postcode || ""}
                  onChange={(e) =>
                    setPrimaryAddress({
                      ...primaryAddress,
                      postcode: e.target.value,
                    })
                  }
                />
                <input
                  type="text"
                  placeholder="Country"
                  className={inputStyle}
                  value={primaryAddress.country || ""}
                  onChange={(e) =>
                    setPrimaryAddress({
                      ...primaryAddress,
                      country: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Column 3 */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Contact Person</label>
              <input
                type="text"
                className={inputStyle}
                value={primaryAddress.contact_person || ""}
                onChange={(e) =>
                  setPrimaryAddress({
                    ...primaryAddress,
                    contact_person: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Telephone</label>
              <input
                type="text"
                className={inputStyle}
                value={primaryAddress.phone || ""}
                onChange={(e) =>
                  setPrimaryAddress({
                    ...primaryAddress,
                    phone: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Email</label>
              <input
                type="text"
                className={inputStyle}
                value={primaryAddress.email || ""}
                onChange={(e) =>
                  setPrimaryAddress({
                    ...primaryAddress,
                    email: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Purchaser</label>
              <input
                type="text"
                className={inputStyle}
                value={note.purchaser || ""}
                onChange={(e) => updateField("purchaser", e.target.value)}
              />
            </div>
          </div>

          {/* Column 4 */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle} title="Supplier Credit Note Date">
                Suppl. CN Date
              </label>
              <input
                type="date"
                className={inputStyle}
                value={note.invoice_date || ""}
                onChange={(e) => updateField("invoice_date", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle} title="Supplier Credit Note No.">
                Suppl. CN No.
              </label>
              <input
                type="text"
                className={inputStyle}
                placeholder="e.g. INV-9932"
                value={note.reference || ""}
                onChange={(e) => updateField("reference", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Date Dispatch</label>
              <input
                type="date"
                className={inputStyle}
                value={note.order_date?.split("T")[0] ?? ""}
                onChange={(e) => updateField("order_date", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle} title="Supplier Receipt Date">
                Suppl. Rec. Date
              </label>
              <input
                type="date"
                className={inputStyle}
                value={note.receipt_date?.split("T")[0] ?? ""}
                onChange={(e) => updateField("receipt_date", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Previous Code</label>
              <input
                type="text"
                className={inputStyle}
                value={note.previous_code || ""}
                onChange={(e) => updateField("previous_code", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------------- INVOICING TAB ---------------- */}
      {activeTab === "invoicing" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 space-x-2">
          {/* Column 1 */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Pay to Suppl. No.</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  readOnly
                  className={`${inputStyle} font-mono`}
                  value={note.supplier_no || "Click Select..."}
                />
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(true)}
                  className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:search" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Name</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={note.supplier_name || ""}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Address Line 1</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.address_1 || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    address_1: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Address Line 2</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.address_2 || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    address_2: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>City</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.city || ""}
                onChange={(e) =>
                  setBillingAddress({ ...billingAddress, city: e.target.value })
                }
              />
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>County</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.county || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    county: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Postcode/Co.</label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="text"
                  placeholder="Postcode"
                  className={inputStyle}
                  value={billingAddress.postcode || ""}
                  onChange={(e) =>
                    setBillingAddress({
                      ...billingAddress,
                      postcode: e.target.value,
                    })
                  }
                />
                <input
                  type="text"
                  placeholder="Country"
                  className={inputStyle}
                  value={billingAddress.country || ""}
                  onChange={(e) =>
                    setBillingAddress({
                      ...billingAddress,
                      country: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Contact Person</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.contact_person || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    contact_person: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Telephone</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.phone || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    phone: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Email</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.email || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    email: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* Column 3 */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Payable Bank</label>
              <input
                type="text"
                className={inputStyle}
                value={note.payable_bank || ""}
                onChange={(e) => updateField("payable_bank", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Payment Terms</label>
              <input
                type="text"
                className={inputStyle}
                value={note.payment_terms || ""}
                onChange={(e) => updateField("payment_terms", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Payment Method</label>
              <input
                type="text"
                className={inputStyle}
                value={note.payment_method || ""}
                onChange={(e) => updateField("payment_method", e.target.value)}
              />
            </div>
          </div>

          {/* Column 4 */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Currency *</label>
              <select
                className={inputStyle}
                value={currencyConfig.currency_id ?? ""}
                onChange={(e) => {
                  const targetId = e.target.value;
                  const matched = currencies.find((c) => c.id === targetId);
                  setCurrencyConfig({
                    currency_id: targetId,
                    exchange_rate: matched ? matched.exchange_rate : 1,
                  });
                }}
              >
                <option value="">Select Base Currency...</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SHIPPING TAB ---------------- */}
      {activeTab === "shipping" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 space-x-2">
          {/* Column 1 */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Location Name</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.name || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Address Line 1</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.address_1 || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    address_1: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Address Line 2</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.address_2 || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    address_2: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>City</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.city || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    city: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>County</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.county || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    county: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Postcode/Co.</label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="text"
                  placeholder="Postcode"
                  className={inputStyle}
                  value={shippingAddress.postcode || ""}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      postcode: e.target.value,
                    })
                  }
                />
                <input
                  type="text"
                  placeholder="Country"
                  className={inputStyle}
                  value={shippingAddress.country || ""}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      country: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Contact</label>
              <input
                type="text"
                className={inputStyle}
                value={note.contact || ""}
                onChange={(e) => updateField("contact", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Book In Tel No.</label>
              <input
                type="text"
                className={inputStyle}
                value={note.book_in_phone || ""}
                onChange={(e) => updateField("book_in_phone", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Book In Contact</label>
              <input
                type="text"
                className={inputStyle}
                value={note.book_in_contact || ""}
                onChange={(e) => updateField("book_in_contact", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Book In Email</label>
              <input
                type="text"
                className={inputStyle}
                value={note.book_in_email || ""}
                onChange={(e) => updateField("book_in_email", e.target.value)}
              />
            </div>
          </div>

          {/* Column 3 */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle} title="Shipment Method">
                Shipt. Method
              </label>
              <input
                type="text"
                className={inputStyle}
                value={note.shipment_method || ""}
                onChange={(e) => updateField("shipment_method", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle}>Shipping Agent</label>
              <input
                type="text"
                className={inputStyle}
                value={note.shipping_agent || ""}
                onChange={(e) => updateField("shipping_agent", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelStyle} title="Shipment Reference No.">
                Shipt. Ref. No.
              </label>
              <input
                type="text"
                className={inputStyle}
                value={note.shipment_ref_no || ""}
                onChange={(e) => updateField("shipment_ref_no", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label
                className={labelStyle}
                title="Warehouse Booking Reference No."
              >
                W/H Book. Ref.
              </label>
              <input
                type="text"
                className={inputStyle}
                value={note.warehouse_booking_ref_no || ""}
                onChange={(e) =>
                  updateField("warehouse_booking_ref_no", e.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label
                className={labelStyle}
                title="Supplier Booking Reference No."
              >
                Suppl. W/H Ref.
              </label>
              <input
                type="text"
                className={inputStyle}
                value={note.supplier_booking_ref_no || ""}
                onChange={(e) =>
                  updateField("supplier_booking_ref_no", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
