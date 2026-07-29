// app/components/sales/orders/OrderFormTabs.tsx

import React from "react";
import { Icon } from "@iconify/react";

import {
  SalesOrder,
  SalesOrderAddress,
  SalesOrderLine,
} from "@/types/sales-order";

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
  activeTab: "general" | "invoicing" | "shipping" | "margin";
  order: Partial<SalesOrder>;
  primaryAddress: Address;
  setPrimaryAddress: React.Dispatch<React.SetStateAction<Address>>;
  billingAddress: Address;
  setBillingAddress: React.Dispatch<React.SetStateAction<Address>>;
  shippingAddress: Address;
  setShippingAddress: React.Dispatch<React.SetStateAction<Address>>;
  currencyConfig: CurrencyConfig;
  setCurrencyConfig: React.Dispatch<React.SetStateAction<CurrencyConfig>>;
  currencies: Currency[];
  updateOrderField: <K extends keyof SalesOrder>(
    field: K,
    value: SalesOrder[K],
  ) => void;
  setCustomerModalOpen: (open: boolean) => void;
  labelStyle?: string;
  inputStyle?: string;
}

export const OrderFormTabs: React.FC<OrderFormTabsProps> = ({
  activeTab,
  order,
  primaryAddress,
  setPrimaryAddress,
  billingAddress,
  setBillingAddress,
  shippingAddress,
  setShippingAddress,
  currencyConfig,
  setCurrencyConfig,
  currencies,
  updateOrderField,
  setCustomerModalOpen,
  labelStyle = "text-xs font-medium text-slate-600 dark:text-slate-400 self-center",
  inputStyle = "w-full text-xs px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200",
}) => {
  const inputcolumnDivStyle =
    "w-full text-xs px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200";
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm w-full">
      {/* ---------------- GENERAL TAB ---------------- */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 space-x-2">
          {/* Column 1 */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Debit Note No.</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={order.order_no || ""}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Supplier No. <span className="text-red-500">*</span></label>
              <div className="col-span-8 flex gap-1">
                <input
                  type="text"
                  readOnly
                  className={`${inputStyle} font-mono`}
                  value={order.customer_no || "Click Select..."}
                />
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:search" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Customer Name</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={order.customer_name || ""}
              />
            </div>

            {/* <div className="grid grid-cols-12 items-center gap-2">
              <label
                className={labelStyle}
                title="Warehouse Booking Reference No."
              >
                Linked PO
              </label>
              <input
                type="text"
                className={inputStyle}
                value={order.linked_po || ""}
                onChange={(e) => updateField("linked_po", e.target.value)}
              />
            </div> */}
          </div>

          {/* Column 2 */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Postcode/Co.</label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="text"
                  placeholder="Postcode"
                  className={inputcolumnDivStyle}
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
                  className={inputcolumnDivStyle}
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            {/* <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Purchaser</label>
              <input
                type="text"
                className={inputStyle}
                value={order.purchaser || ""}
                onChange={(e) => updateField("purchaser", e.target.value)}
              />
            </div> */}
          </div>

          {/* Column 4 */}
          <div className="space-y-2">
            {/* <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle} title="Supplier Credit Note Date">
                Suppl. CN Date
              </label>
              <input
                type="date"
                className={inputStyle}
                value={order.invoice_date || ""}
                onChange={(e) => updateField("invoice_date", e.target.value)}
              />
            </div> */}
            {/* <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle} title="Supplier Credit Note No.">
                Suppl. CN No.
              </label>
              <input
                type="text"
                className={inputStyle}
                placeholder="e.g. INV-9932"
                value={order.reference || ""}
                onChange={(e) => updateField("reference", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Date Dispatch</label>
              <input
                type="date"
                className={inputStyle}
                value={order.order_date?.split("T")[0] ?? ""}
                onChange={(e) => updateField("order_date", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle} title="Supplier Receipt Date">
                Suppl. Rec. Date
              </label>
              <input
                type="date"
                className={inputStyle}
                value={order.receipt_date?.split("T")[0] ?? ""}
                onChange={(e) => updateField("receipt_date", e.target.value)}
              />
            </div> */}

            {/* <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Previous Code</label>
              <input
                type="text"
                className={inputStyle}
                value={order.previous_code || ""}
                onChange={(e) => updateField("previous_code", e.target.value)}
              />
            </div> */}
          </div>
        </div>
      )}

      {/* ---------------- INVOICING TAB ---------------- */}
      {activeTab === "invoicing" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 space-x-2">
          {/* Column 1 */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Pay to Suppl. No.</label>
              <div className="col-span-8 flex gap-1">
                <input
                  type="text"
                  readOnly
                  className={`${inputStyle} font-mono`}
                  value={order.customer_no || "Click Select..."}
                />
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:search" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Name</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={order.customer_name || ""}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Postcode/Co.</label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="text"
                  placeholder="Postcode"
                  className={inputcolumnDivStyle}
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
                  className={inputcolumnDivStyle}
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            {/* <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Payable Bank</label>
              <input
                type="text"
                className={inputStyle}
                value={order.payable_bank || ""}
                onChange={(e) => updateField("payable_bank", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Payment Terms</label>
              <input
                type="text"
                className={inputStyle}
                value={order.payment_terms || ""}
                onChange={(e) => updateField("payment_terms", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Payment Method</label>
              <input
                type="text"
                className={inputStyle}
                value={order.payment_method || ""}
                onChange={(e) => updateField("payment_method", e.target.value)}
              />
            </div> */}
          </div>

          {/* Column 4 */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Currency <span className="text-red-500">*</span></label>
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
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
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Postcode/Co.</label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="text"
                  placeholder="Postcode"
                  className={inputcolumnDivStyle}
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
                  className={inputcolumnDivStyle}
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
            {/* <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Contact</label>
              <input
                type="text"
                className={inputStyle}
                value={order.contact || ""}
                onChange={(e) => updateField("contact", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Book In Tel No.</label>
              <input
                type="text"
                className={inputStyle}
                value={order.book_in_phone || ""}
                onChange={(e) => updateField("book_in_phone", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Book In Contact</label>
              <input
                type="text"
                className={inputStyle}
                value={order.book_in_contact || ""}
                onChange={(e) => updateField("book_in_contact", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Book In Email</label>
              <input
                type="text"
                className={inputStyle}
                value={order.book_in_email || ""}
                onChange={(e) => updateField("book_in_email", e.target.value)}
              />
            </div> */}
          </div>

          {/* Column 3 */}
          <div className="space-y-2">
            {/* <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle} title="Shipment Method">
                Shipt. Method
              </label>
              <input
                type="text"
                className={inputStyle}
                value={order.shipment_method || ""}
                onChange={(e) => updateField("shipment_method", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Shipping Agent</label>
              <input
                type="text"
                className={inputStyle}
                value={order.shipping_agent || ""}
                onChange={(e) => updateField("shipping_agent", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle} title="Shipment Reference No.">
                Shipt. Ref. No.
              </label>
              <input
                type="text"
                className={inputStyle}
                value={order.shipment_ref_no || ""}
                onChange={(e) => updateField("shipment_ref_no", e.target.value)}
              />
            </div> */}
          </div>

          <div className="space-y-2">
            {/* <div className="grid grid-cols-12 items-center gap-2">
              <label
                className={labelStyle}
                title="Warehouse Reference No."
              >
                Warehouse Ref.
              </label>
              <input
                type="text"
                className={inputStyle}
                value={order.warehouse_booking_ref_no || ""}
                onChange={(e) =>
                  updateField("warehouse_booking_ref_no", e.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-12 items-center gap-2">
              <label
                className={labelStyle}
                title="Supplier Booking Reference No."
              >
                Suppl. W/H Ref.
              </label>
              <input
                type="text"
                className={inputStyle}
                value={order.supplier_booking_ref_no || ""}
                onChange={(e) =>
                  updateField("supplier_booking_ref_no", e.target.value)
                }
              />
            </div> */}
          </div>
        </div>
      )}
    </div>
  );
};
/* 
<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
  
        {activeTab === "general" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelStyle}>Order No.</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={order.order_no || ""}
              />
            </div>
            <div>
              <label className={labelStyle}>Customer No. <span className="text-red-500">*</span></label>
              <div className="col-span-8 flex gap-1">
                <input
                  type="text"
                  readOnly
                  className={`${inputStyle} font-mono`}
                  value={order.customer_id || "Click Select..."}
                />
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:search" />
                </button>
              </div>
            </div>
            <div>
              <label className={labelStyle}>Name</label>
              <input
                type="text"
                className={inputStyle}
                value={order.customer_name || ""}
                onChange={(e) =>
                  updateOrderField("customer_name", e.target.value)
                }
              />
            </div>
            <div>
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


            <div>
              <label className={labelStyle}>Postcode/Co.</label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="text"
                  placeholder="Postcode"
                  className={inputcolumnDivStyle}
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
                  className={inputcolumnDivStyle}
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

            <div>
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
            <div>
              <label className={labelStyle}>Email</label>
              <input
                type="text"
                className={inputStyle}
                value={order.email || ""}
                onChange={(e) => updateOrderField("email", e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle}>Salesperson</label>
              <input
                type="text"
                className={inputStyle}
                value={order.salesperson || ""}
                onChange={(e) =>
                  updateOrderField("salesperson", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Cust. Order No.</label>
              <input
                type="text"
                className={inputStyle}
                value={order.cust_order_no || ""}
                onChange={(e) =>
                  updateOrderField("cust_order_no", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Link to PO</label>
              <input
                type="text"
                className={inputStyle}
                value={order.link_to_po || ""}
                onChange={(e) => updateOrderField("link_to_po", e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle}>SQ No.</label>
              <input
                type="text"
                className={inputStyle}
                value={order.sq_no || ""}
                onChange={(e) => updateOrderField("sq_no", e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle}>Source Of Order</label>
              <select
                className={inputStyle}
                value={order.source_of_order || "Others"}
                onChange={(e) =>
                  updateOrderField("source_of_order", e.target.value)
                }
              >
                <option value="Others">Others</option>
                <option value="Shopify">Shopify</option>
                <option value="B2B Portal">B2B Portal</option>
              </select>
            </div>
            <div>
              <label className={labelStyle}>Posting Date</label>
              <input
                type="date"
                className={inputStyle}
                value={order.posting_date || ""}
                onChange={(e) =>
                  updateOrderField("posting_date", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Order Date</label>
              <input
                type="date"
                className={inputStyle}
                value={order.order_date || ""}
                onChange={(e) => updateOrderField("order_date", e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle}>Dispatch Date</label>
              <input
                type="date"
                className={inputStyle}
                value={order.dispatch_date || ""}
                onChange={(e) =>
                  updateOrderField("dispatch_date", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Req. Del. Date</label>
              <input
                type="date"
                className={inputStyle}
                value={order.requested_delivery_date || ""}
                onChange={(e) =>
                  updateOrderField("requested_delivery_date", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Delivery Date</label>
              <input
                type="date"
                className={inputStyle}
                value={order.delivery_date || ""}
                onChange={(e) =>
                  updateOrderField("delivery_date", e.target.value)
                }
              />
            </div>
          </div>
        )}


        {activeTab === "invoicing" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelStyle}>Bill-to Cust. No.</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={order.customer_id || ""}
              />
            </div>
            <div>
              <label className={labelStyle}>Currency</label>
              <input
                type="text"
                className={inputStyle}
                value={order.currency_code || "GBP"}
                onChange={(e) =>
                  updateOrderField("currency_code", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Invoiced Value Allocation</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={Number(order.invoiced_amount || 0).toFixed(2)}
              />
            </div>
          </div>
        )}


        {activeTab === "shipping" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Shipping Destination Name</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.company_name || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    company_name: e.target.value,
                  })
                }
              />
            </div>
            <div>
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
            <div>
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
            <div>
              <label className={labelStyle}>City Destination</label>
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
          </div>
        )}


        {activeTab === "margin" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-lg bg-slate-50 dark:bg-slate-950/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Profit Margin (LCY)
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Sales Value</span>
                  <span className="font-semibold">
                    {Number(order.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total Tax Amount</span>
                  <span className="font-semibold">
                    {Number(order.tax_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-t pt-1 font-bold text-emerald-600">
                  <span className="">Grand Total</span>
                  <span className="">
                    {Number(order.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
*/
