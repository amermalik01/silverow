// app/components/sales/returns/OrderFormTabs.tsx

import React from "react";
import { Icon } from "@iconify/react";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

import {
  SalesReturn,
  SalesReturnAddress,
  SalesReturnLine,
  SalesReturnMasterData,
} from "@/types/sales-return";

import MasterDropdown from "../../common/MasterDropdown";
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

interface CurrencyConfig {
  currency_id: string;
  exchange_rate: number;
}

interface BankAccountItem {
  id: string | number;
  bank_name?: string;
  account_name?: string;
  name?: string;
}

interface NamedOptionItem {
  id: string | number;
  name: string;
  days?: number;
}

type ExtendedMasterData = SalesReturnMasterData & {
  bank_accounts?: BankAccountItem[];
  bankAccounts?: BankAccountItem[];
  payment_terms?: NamedOptionItem[];
  payment_methods?: NamedOptionItem[];
  paymentMethods?: NamedOptionItem[];
};

interface OrderFormTabsProps {
  activeTab: "general" | "invoicing" | "shipping";
  order: Partial<SalesReturn>;
  primaryAddress: Address;
  setPrimaryAddress: React.Dispatch<React.SetStateAction<Address>>;
  billingAddress: Address;
  setBillingAddress: React.Dispatch<React.SetStateAction<Address>>;
  shippingAddress: Address;
  setShippingAddress: React.Dispatch<React.SetStateAction<Address>>;
  currencyConfig: CurrencyConfig;
  setCurrencyConfig: React.Dispatch<React.SetStateAction<CurrencyConfig>>;
  // currencies: Currency[];
  masterData: SalesReturnMasterData | null;
  updateField: <K extends keyof SalesReturn>(
    field: K,
    value: SalesReturn[K],
  ) => void;
  setCustomerModalOpen: (open: boolean) => void;
  setLocationModalOpen: (open: boolean) => void;
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
  masterData,
  updateField,
  setCustomerModalOpen,
  setLocationModalOpen,
  labelStyle = "text-xs font-medium text-slate-600 dark:text-slate-400 self-center",
  inputStyle = "w-full text-xs px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200",
}) => {
  const inputcolumnDivStyle =
    "w-full text-xs px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200";

  const maxOrderDate =
    [order.posting_date, order.requested_delivery_date, order.delivery_date]
      .filter(Boolean)
      .map((d) => d!.split("T")[0])
      .sort()[0] ?? "";

  const calculateDueDate = (orderDate: string, days = 0) => {
    if (!orderDate) return "";

    const date = new Date(orderDate);
    date.setDate(date.getDate() + Number(days));

    return date.toISOString().split("T")[0];
  };

  const isSettingsDisabled = !order.anonymous_customer;

  const typedMasterData = masterData as ExtendedMasterData | null;

  const bankAccounts =
    typedMasterData?.bankAccounts || typedMasterData?.bank_accounts || [];
  const paymentTerms =
    typedMasterData?.paymentTerms || typedMasterData?.payment_terms || [];
  const paymentMethods =
    typedMasterData?.paymentMethods || typedMasterData?.payment_methods || [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm w-full">
      {/* ---------------- GENERAL TAB ---------------- */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 space-x-2">
          {/* Column 1 */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Return Order No.</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={order.return_no || ""}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>
                Customer No. <span className="text-red-500">*</span>
              </label>
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
                  className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}> Name</label>
              <input
                type="text"
                disabled={isSettingsDisabled}
                className={inputStyle}
                value={order.customer_name || ""}
              />
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Address Line 1</label>
              <input
                type="text"
                className={inputStyle}
                disabled={isSettingsDisabled}
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
                disabled={isSettingsDisabled}
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
                disabled={isSettingsDisabled}
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
                disabled={isSettingsDisabled}
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
              <div className="col-span-8 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Postcode"
                  disabled={isSettingsDisabled}
                  className={inputcolumnDivStyle}
                  value={primaryAddress.postcode || ""}
                  onChange={(e) =>
                    setPrimaryAddress({
                      ...primaryAddress,
                      postcode: e.target.value,
                    })
                  }
                />

                <MasterDropdown
                  type="country"
                  value={primaryAddress.country || "United Kingdom"}
                  disabled={isSettingsDisabled}
                  className={inputcolumnDivStyle}
                  onChange={(val) =>
                    setPrimaryAddress({
                      ...primaryAddress,
                      country: val ?? undefined,
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
                disabled={isSettingsDisabled}
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
                disabled={isSettingsDisabled}
                value={primaryAddress.email || ""}
                onChange={(e) =>
                  setPrimaryAddress({
                    ...primaryAddress,
                    email: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Salesperson</label>
              <input
                type="text"
                className={inputStyle}
                disabled={isSettingsDisabled}
                value={order.salesperson || ""}
                onChange={(e) => updateField("salesperson", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle} title="Customer Order No.">
                Claim No.
              </label>
              <input
                type="text"
                className={inputStyle}
                value={order.cust_order_no || ""}
                onChange={(e) => updateField("cust_order_no", e.target.value)}
              />
            </div>
          </div>

          {/* Column 4 */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Posting Date</label>
              <DatePicker
                value={
                  order.posting_date ? new Date(order.posting_date) : undefined
                }
                containerClassName="col-span-8"
                minDate={
                  order.order_date ? new Date(order.order_date) : undefined
                }
                onChange={(date) =>
                  updateField(
                    "posting_date",
                    date ? format(date, "yyyy-MM-dd") : "",
                  )
                }
              />
              {/* <input
                type="date"
                className={inputStyle}
                value={order.posting_date || ""}
                min={order.order_date?.split("T")[0] ?? ""}
                onChange={(e) => updateField("posting_date", e.target.value)}
              /> */}
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Claim Date</label>

              <DatePicker
                value={
                  order.order_date ? new Date(order.order_date) : undefined
                }
                containerClassName="col-span-8"
                maxDate={maxOrderDate ? new Date(maxOrderDate) : undefined}
                onChange={(date) => {
                  const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
                  updateField("order_date", formattedDate);

                  const selected = typedMasterData?.paymentTerms?.find(
                    (x) => x.id === order.payment_terms_id,
                  );

                  if (selected && formattedDate) {
                    updateField(
                      "due_date",
                      calculateDueDate(formattedDate, selected.days),
                    );
                  }
                }}
              />

              {/* <input
                type="date"
                className={inputStyle}
                value={order.order_date?.split("T")[0] ?? ""}
                max={maxOrderDate}
                onChange={(e) => {
                  const orderDate = e.target.value;

                  updateField("order_date", orderDate);

                  const selected = masterData?.paymentTerms.find(
                    (x) => x.id === order.payment_terms_id,
                  );

                  if (selected) {
                    updateField(
                      "due_date",
                      calculateDueDate(orderDate, selected.days),
                    );
                  }
                }}
              /> */}
            </div>

            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Req. Rec. Date</label>

              <DatePicker
                value={
                  order.requested_delivery_date
                    ? new Date(order.requested_delivery_date)
                    : undefined
                }
                containerClassName="col-span-8"
                minDate={
                  order.order_date ? new Date(order.order_date) : undefined
                }
                onChange={(date) =>
                  updateField(
                    "requested_delivery_date",
                    date ? format(date, "yyyy-MM-dd") : "",
                  )
                }
              />
              {/* <input
                type="date"
                className={inputStyle}
                value={order.requested_delivery_date?.split("T")[0] ?? ""}
                min={order.order_date?.split("T")[0] ?? ""}
                onChange={(e) =>
                  updateField("requested_delivery_date", e.target.value)
                }
              /> */}
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Receipt Date</label>

              <DatePicker
                value={
                  order.delivery_date
                    ? new Date(order.delivery_date)
                    : undefined
                }
                containerClassName="col-span-8"
                minDate={
                  order.order_date ? new Date(order.order_date) : undefined
                }
                onChange={(date) =>
                  updateField(
                    "delivery_date",
                    date ? format(date, "yyyy-MM-dd") : "",
                  )
                }
              />
              {/* <input
                type="date"
                className={inputStyle}
                value={order.delivery_date?.split("T")[0] ?? ""}
                min={
                  order.delivery_date?.split("T")[0] ??
                  order.order_date?.split("T")[0] ??
                  ""
                }
                onChange={(e) => updateField("delivery_date", e.target.value)}
              /> */}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- INVOICING TAB ---------------- */}
      {activeTab === "invoicing" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 space-x-2">
          {/* Column 1 */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Bill to Cust. No.</label>
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
                  className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Name</label>
              <input
                type="text"
                disabled={isSettingsDisabled}
                className={inputStyle}
                value={order.customer_name || ""}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Address Line 1</label>
              <input
                type="text"
                className={inputStyle}
                disabled={isSettingsDisabled}
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
                disabled={isSettingsDisabled}
                value={billingAddress.address_2 || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    address_2: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>City</label>
              <input
                type="text"
                className={inputStyle}
                disabled={isSettingsDisabled}
                value={billingAddress.city || ""}
                onChange={(e) =>
                  setBillingAddress({ ...billingAddress, city: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>County</label>
              <input
                type="text"
                className={inputStyle}
                disabled={isSettingsDisabled}
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
              <div className="col-span-8 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Postcode"
                  disabled={isSettingsDisabled}
                  className={inputcolumnDivStyle}
                  value={billingAddress.postcode || ""}
                  onChange={(e) =>
                    setBillingAddress({
                      ...billingAddress,
                      postcode: e.target.value,
                    })
                  }
                />

                <MasterDropdown
                  type="country"
                  value={billingAddress.country || "United Kingdom"}
                  disabled={isSettingsDisabled}
                  className={inputcolumnDivStyle}
                  onChange={(val) =>
                    setBillingAddress({
                      ...billingAddress,
                      country: val ?? undefined,
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
          </div>

          {/* Column 3 */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Telephone</label>
              <input
                type="text"
                className={inputStyle}
                disabled={isSettingsDisabled}
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
                disabled={isSettingsDisabled}
                value={billingAddress.email || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Finance Charge</label>
              <input
                type="number"
                className={inputStyle}
                value={order.finance_charges ?? 0}
                onChange={(e) =>
                  updateField("finance_charges", Number(e.target.value))
                }
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle} title="Insurance Charge">
                Ins. Charge
              </label>
              <input
                type="number"
                className={inputStyle}
                value={order.insurance_charges ?? 0}
                onChange={(e) =>
                  updateField("insurance_charges", Number(e.target.value))
                }
              />
            </div>
          </div>

          {/* Column 4 */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>
                Currency <span className="text-red-500">*</span>
              </label>
              <select
                disabled={isSettingsDisabled}
                className={inputStyle}
                value={currencyConfig.currency_id ?? ""}
                onChange={(e) => {
                  const targetId = e.target.value;
                  const matched = masterData?.currencies.find(
                    (c) => c.id === targetId,
                  );
                  setCurrencyConfig({
                    currency_id: targetId,
                    exchange_rate: matched ? matched.exchange_rate : 1,
                  });
                }}
              >
                <option value="">Select Currency...</option>
                {masterData?.currencies.map((c) => (
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
              <div className="col-span-8 flex gap-1">
                <input
                  type="text"
                  readOnly
                  className={`${inputStyle} font-mono`}
                  value={shippingAddress.name || "Click Select..."}
                />
                <button
                  type="button"
                  disabled={isSettingsDisabled || !order.customer_id}
                  onClick={() => setLocationModalOpen(true)}
                  className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
              </div>
              {/* <input
                type="text"
                className={inputStyle}
                disabled={isSettingsDisabled}
                value={shippingAddress.name || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    name: e.target.value,
                  })
                }
              /> */}
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Address Line 1</label>
              <input
                type="text"
                disabled={isSettingsDisabled}
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
                disabled={isSettingsDisabled}
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
                disabled={isSettingsDisabled}
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
                disabled={isSettingsDisabled}
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
              <div className="col-span-8 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Postcode"
                  disabled={isSettingsDisabled}
                  className={inputcolumnDivStyle}
                  value={shippingAddress.postcode || ""}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      postcode: e.target.value,
                    })
                  }
                />
                <MasterDropdown
                  type="country"
                  value={shippingAddress.country || "United Kingdom"}
                  disabled={isSettingsDisabled}
                  className={inputcolumnDivStyle}
                  onChange={(val) =>
                    setShippingAddress({
                      ...shippingAddress,
                      country: val ?? undefined,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
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
            </div>
          </div>

          {/* Column 3 */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle} title="Shipment Method">
                Shipt. Method
              </label>
              <select
                className={inputStyle}
                value={order.shipment_method_id || ""}
                onChange={(e) => {
                  const selected = masterData?.shipmentMethods.find(
                    (x) => x.id === e.target.value,
                  );

                  updateField("shipment_method_id", e.target.value);
                  updateField("shipment_method", selected?.name || "");
                }}
              >
                <option value="">Select...</option>

                {masterData?.shipmentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
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
            </div>

            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Freight Charges</label>
              <input
                type="number"
                className={inputStyle}
                value={order.freight_charges ?? 0}
                onChange={(e) =>
                  updateField("freight_charges", Number(e.target.value))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Delivery Date</label>
              <DatePicker
                value={
                  order.delivery_date
                    ? new Date(order.delivery_date)
                    : undefined
                }
                containerClassName="col-span-8"
                minDate={
                  order.order_date ? new Date(order.order_date) : undefined
                }
                onChange={(date) =>
                  updateField(
                    "delivery_date",
                    date ? format(date, "yyyy-MM-dd") : "",
                  )
                }
              />

              {/* <input
                type="date"
                className={inputStyle}
                value={order.delivery_date?.split("T")[0] ?? ""}
                min={order.order_date?.split("T")[0] ?? ""}
                onChange={(e) => updateField("delivery_date", e.target.value)}
              /> */}
            </div>

            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Delivery Time</label>
              <input
                type="time"
                className={inputStyle}
                value={order.delivery_time?.split("T")[0] ?? ""}
                min={order.order_date?.split("T")[0] ?? ""}
                onChange={(e) => updateField("delivery_time", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle} title="Warehouse Reference No.">
                Warehouse Ref.
              </label>
              <input
                type="text"
                className={inputStyle}
                value={order.warehouse_ref_no || ""}
                onChange={(e) =>
                  updateField("warehouse_ref_no", e.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-12 items-center gap-2">
              <label
                className={labelStyle}
                title="Customer Warehouse Reference No."
              >
                Cust. W/H Ref.
              </label>
              <input
                type="text"
                className={inputStyle}
                value={order.cust_warehouse_ref_no || ""}
                onChange={(e) =>
                  updateField("cust_warehouse_ref_no", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
