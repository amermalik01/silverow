// app/components/sales/quotes/OrderFormTabs.tsx

import React from "react";
import { Icon } from "@iconify/react";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

import {
  SalesQuote,
  SalesQuoteAddress,
  SalesQuoteLine,
  SalesQuoteLineUI,
  SalesQuoteMasterData,
} from "@/types/sales-quote";

import MasterDropdown from "../../common/MasterDropdown";
import AttachmentsTab from "../../shared/AttachmentsTab";
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

type ExtendedMasterData = SalesQuoteMasterData & {
  bank_accounts?: BankAccountItem[];
  bankAccounts?: BankAccountItem[];
  payment_terms?: NamedOptionItem[];
  payment_methods?: NamedOptionItem[];
  paymentMethods?: NamedOptionItem[];
};

interface OrderFormTabsProps {
  activeTab: "general" | "invoicing" | "shipping";//  | "margin" | "attachments"
  quote: Partial<SalesQuote>;
  primaryAddress: Address;
  setPrimaryAddress: React.Dispatch<React.SetStateAction<Address>>;
  billingAddress: Address;
  setBillingAddress: React.Dispatch<React.SetStateAction<Address>>;
  shippingAddress: Address;
  setShippingAddress: React.Dispatch<React.SetStateAction<Address>>;
  currencyConfig: CurrencyConfig;
  setCurrencyConfig: React.Dispatch<React.SetStateAction<CurrencyConfig>>;
  masterData: SalesQuoteMasterData | null;
  updateField: <K extends keyof SalesQuote>(
    field: K,
    value: SalesQuote[K],
  ) => void;
  // setCustomerModalOpen: (open: boolean) => void;
  onGeneralCustomerSelect: () => void;
  onInvoicingCustomerSelect: () => void;
  setLocationModalOpen: (open: boolean) => void;

  onPurchaseOrderSelect: () => void;
  onShippingAgentSelect: () => void;
  setSalesPersonModalOpen: () => void;

  labelStyle?: string;
  inputStyle?: string;
  inputDateStyle?: string;
  isReadOnly?: boolean;
}

export const OrderFormTabs: React.FC<OrderFormTabsProps> = ({
  activeTab,
  quote,
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

  onGeneralCustomerSelect,
  onInvoicingCustomerSelect,
  setLocationModalOpen,

  onPurchaseOrderSelect,
  onShippingAgentSelect,
  setSalesPersonModalOpen,

  labelStyle = "text-xs font-medium text-slate-600 dark:text-slate-400 self-center",
  inputStyle = "w-full text-xs px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200",
  inputDateStyle = "w-full text-xs px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200",
  isReadOnly = false,
}) => {
  const labelcolumnDivStyle =
    "block text-xs  text-slate-500 dark:text-slate-400 mb-0.5  col-span-2";

  const inputcolumnDivStyle =
    "w-full text-xs px-2 py-1.5 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 disabled:bg-slate-50 dark:disabled:bg-slate-950";

  const selectStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed";

  const maxOrderDate =
    [quote.posting_date, quote.requested_delivery_date, quote.delivery_date]
      .filter(Boolean)
      .map((d) => d!.split("T")[0])
      .sort()[0] ?? "";

  const calculateDueDate = (orderDate: string, days = 0) => {
    if (!orderDate) return "";

    const date = new Date(orderDate);
    date.setDate(date.getDate() + Number(days));

    return date.toISOString().split("T")[0];
  };

  const isSettingsDisabled = isReadOnly || !quote.anonymous_customer;

  const typedMasterData = masterData as ExtendedMasterData | null;

  const bankAccounts =
    typedMasterData?.bankAccounts || typedMasterData?.bank_accounts || [];
  const paymentTerms =
    typedMasterData?.paymentTerms || typedMasterData?.payment_terms || [];
  const paymentMethods =
    typedMasterData?.paymentMethods || typedMasterData?.payment_methods || [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm w-full h-[210px]">
      <div className="h-full overflow-y-auto">
        {/* ---------------- GENERAL TAB ---------------- */}
        {activeTab === "general" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 space-x-2 gap-4">
            {/* Column 1 */}
            <div className="space-y-2">
              {/* <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Order No.</label>
                <input
                  type="text"
                  disabled
                  className={inputStyle}
                  value={quote.order_no || ""}
                />
              </div> */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Customer No.">
                  Customer No. <span className="text-red-500">*</span>
                </label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={`${inputStyle} font-mono`}
                    value={quote.customer_no || "Click Select..."}
                  />
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={onGeneralCustomerSelect}
                    // onClick={() => onGeneralCustomerSelect(true)}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Customer Name</label>
                <input
                  type="text"
                  disabled={isSettingsDisabled}
                  className={inputStyle}
                  value={quote.customer_name || ""}
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Address Line 1">
                  Add. Line 1
                </label>
                <div className="col-span-8 flex gap-1">
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
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Address Line 2">
                  Add. Line 2
                </label>
                <div className="col-span-8 flex gap-1">
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
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>City</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    className={inputStyle}
                    disabled={isSettingsDisabled}
                    value={primaryAddress.city || ""}
                    onChange={(e) =>
                      setPrimaryAddress({
                        ...primaryAddress,
                        city: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>County</label>
                <div className="col-span-8 flex gap-1">
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
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Postcode/Co.</label>
                <div className="col-span-8 grid grid-cols-2 gap-2">
                  <input
                    type="text"
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
                  <input
                    type="text"
                    disabled={isSettingsDisabled}
                    className={inputcolumnDivStyle}
                    value={primaryAddress.country || ""}
                  />

                  {/* <MasterDropdown
                    type="Country"
                    value={primaryAddress.country || "United Kingdom"}
                    disabled={isSettingsDisabled}
                    className={inputcolumnDivStyle}
                    onChange={(val) =>
                      setPrimaryAddress({
                        ...primaryAddress,
                        country: val ?? undefined,
                      })
                    }
                  /> */}
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Contact Person</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
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
                {/* <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.salesperson || ""}
                  onChange={(e) => updateField("salesperson", e.target.value)}
                /> */}
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={inputStyle}
                    value={quote.salesperson || ""}
                    onChange={(e) => updateField("salesperson", e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={setSalesPersonModalOpen}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Customer Order No.">
                  Cust. Order No.<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.cust_order_no || ""}
                  onChange={(e) => updateField("cust_order_no", e.target.value)}
                />
              </div>

            </div>

            {/* Column 4 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>
                  Posting Date<span className="text-red-500">*</span>
                </label>

                <DatePicker
                  value={
                    quote.posting_date
                      ? new Date(quote.posting_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  minDate={
                    quote.order_date ? new Date(quote.order_date) : undefined
                  }
                  onChange={(date) =>
                    updateField(
                      "posting_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Order Date</label>

                <DatePicker
                  value={
                    quote.order_date ? new Date(quote.order_date) : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  maxDate={maxOrderDate ? new Date(maxOrderDate) : undefined}
                  onChange={(date) => {
                    const formattedDate = date
                      ? format(date, "yyyy-MM-dd")
                      : "";
                    updateField("order_date", formattedDate);

                    const selected = typedMasterData?.paymentTerms?.find(
                      (x) => x.id === quote.payment_terms_id,
                    );

                    if (selected && formattedDate) {
                      updateField(
                        "due_date",
                        calculateDueDate(formattedDate, selected.days),
                      );
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Dispatch Date</label>

                <DatePicker
                  value={
                    quote.dispatch_date
                      ? new Date(quote.dispatch_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  minDate={
                    quote.order_date ? new Date(quote.order_date) : undefined
                  }
                  onChange={(date) =>
                    updateField(
                      "dispatch_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Req. Del. Date</label>

                <DatePicker
                  value={
                    quote.requested_delivery_date
                      ? new Date(quote.requested_delivery_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  minDate={
                    quote.order_date ? new Date(quote.order_date) : undefined
                  }
                  onChange={(date) =>
                    updateField(
                      "requested_delivery_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Delivery Date</label>

                <DatePicker
                  value={
                    quote.delivery_date
                      ? new Date(quote.delivery_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  minDate={
                    quote.order_date ? new Date(quote.order_date) : undefined
                  }
                  onChange={(date) =>
                    updateField(
                      "delivery_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------------- INVOICING TAB ---------------- */}
        {activeTab === "invoicing" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 space-x-2 gap-4 ">
            {/* Column 1 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Bill to Customer No.">
                  Bill to <br></br>Cust. No.
                </label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={`${inputStyle} font-mono`}
                    value={quote.customer_no || "Click Select..."}
                  />
                  <button
                    type="button"
                    // onClick={() => setCustomerModalOpen(true)}
                    onClick={onInvoicingCustomerSelect}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Customer Name">
                  Cust. Name
                </label>
                <input
                  type="text"
                  disabled={isSettingsDisabled}
                  className={inputStyle}
                  value={quote.customer_name || ""}
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Address Line 1">
                  Add. Line 1
                </label>
                <div className="col-span-8 flex gap-1">
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
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Address Line 2">
                  Add. Line 2
                </label>
                <div className="col-span-8 flex gap-1">
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
            </div>

            {/* Column 2 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>City</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    className={inputStyle}
                    disabled={isSettingsDisabled}
                    value={billingAddress.city || ""}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        city: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>County</label>
                <div className="col-span-8 flex gap-1">
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
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Postcode/Co.</label>
                <div className="col-span-8 grid grid-cols-2 gap-2">
                  <input
                    type="text"
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

                  <input
                    type="text"
                    disabled={isSettingsDisabled}
                    className={inputcolumnDivStyle}
                    value={billingAddress.country || ""}
                  />

                  {/* <MasterDropdown
                    type="Country"
                    value={billingAddress.country || "United Kingdom"}
                    disabled={isSettingsDisabled}
                    className={inputcolumnDivStyle}
                    onChange={(val) =>
                      setBillingAddress({
                        ...billingAddress,
                        country: val ?? undefined,
                      })
                    }
                  /> */}
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
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
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
                <label className={labelStyle}>
                  Currency {/* <span className="text-red-500">*</span> */}
                </label>
                <input
                  type="text"
                  disabled={isSettingsDisabled}
                  readOnly
                  className={selectStyle}
                  value={(() => {
                    const currency = masterData?.currencies.find(
                      (c) => c.id === currencyConfig.currency_id,
                    );

                    return currency
                      ? `${currency.code} - ${currency.name}`
                      : "";
                  })()}
                />
                {/* <select
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
                </select> */}
              </div>
            </div>

            {/* Column 4 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Payable Bank">
                  Pay. Bank
                </label>
                <select
                  disabled={isReadOnly}
                  className={inputStyle}
                  value={quote.payable_bank || ""}
                  onChange={(e) => updateField("payable_bank", e.target.value)}
                >
                  <option value="">Select Bank...</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id || b.account_name}>
                      {b.bank_name || b.account_name || b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Payment Terms">
                  Pay. Terms
                </label>

                <select
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.payment_terms_id ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const selected = paymentTerms.find(
                      (x) => String(x.id) === String(val),
                    );

                    updateField("payment_terms_id", val);
                    updateField("payment_terms", selected?.name || "");

                    if (quote.order_date && selected) {
                      updateField(
                        "due_date",
                        calculateDueDate(quote.order_date, selected.days),
                      );
                    }
                  }}
                >
                  <option value="">Select...</option>
                  {paymentTerms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Due Date</label>

                <DatePicker
                  value={quote.due_date ? new Date(quote.due_date) : undefined}
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  minDate={
                    quote.order_date ? new Date(quote.order_date) : undefined
                  }
                  onChange={(date) =>
                    updateField(
                      "due_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Payment Method">
                  Pay. Method
                </label>

                <select
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.payment_method_id ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const selected = paymentMethods.find(
                      (x) => String(x.id) === String(val),
                    );

                    updateField("payment_method_id", val);
                    updateField("payment_method", selected?.name || "");
                  }}
                >
                  <option value="">Select...</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Column 4 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Finance Charge</label>
                <input
                  type="number"
                  className={inputStyle}
                  value={quote.finance_charges ?? 0}
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
                  value={quote.insurance_charges ?? 0}
                  onChange={(e) =>
                    updateField("insurance_charges", Number(e.target.value))
                  }
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Link to SO No.">
                  Link to PO No.
                </label>
                {/* <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.link_to_po || ""}
                  onChange={(e) => updateField("link_to_po", e.target.value)}
                /> */}
                <div className="col-span-8 flex gap-1">
                  <div
                    className={`flex-1 flex flex-wrap items-center gap-1 min-h-[30px] p-1 border rounded dark:bg-slate-800 dark:border-slate-700 ${inputStyle}`}
                  >
                    {quote.link_to_po ? (
                      quote.link_to_po.split(",").map((poCode) => {
                        const trimmedCode = poCode.trim();
                        if (!trimmedCode) return null;
                        return (
                          <span
                            key={trimmedCode}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-emerald-700 dark:text-emerald-400 border dark:border-slate-600 font-medium"
                          >
                            <span>{trimmedCode}</span>
                            {/* 
                              <Link ${trimmedCode}`} PO 
                                className="hover:text-emerald-900 dark:hover:text-emerald-200" 
                                href="{`/purchases/purchase-orders/${trimmedCode}`}" 
                                rel="noopener noreferrer" 
                                target="_blank" 
                                title="{`Open">
                                <Icon className="w-3 h-3" icon="tabler:external-link"/>
                              </Link> */}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-slate-400 text-xs px-1"></span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={onPurchaseOrderSelect}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                    title="Select Linked Purchase Orders"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Converted By</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.converted_by || ""}
                  onChange={(e) => updateField("converted_by", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------------- SHIPPING TAB ---------------- */}
        {activeTab === "shipping" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 space-x-2 gap-4">
            {/* Column 1 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Location Name</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={`${inputStyle} font-mono`}
                    value={shippingAddress.name || "Click Select..."}
                  />
                  <button
                    type="button"
                    disabled={isReadOnly || !quote.customer_id}
                    onClick={() => setLocationModalOpen(true)}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Address Line 1">
                  Add. Line 1
                </label>
                <div className="col-span-8 flex gap-1">
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
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Address Line 2">
                  Add. Line 2
                </label>
                <div className="col-span-8 flex gap-1">
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
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>City</label>
                <div className="col-span-8 flex gap-1">
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
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>County</label>
                <div className="col-span-8 flex gap-1">
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
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Postcode/Co.</label>
                <div className="col-span-8 grid grid-cols-2 gap-2">
                  <input
                    type="text"
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
                  <input
                    type="text"
                    disabled={isSettingsDisabled}
                    className={inputcolumnDivStyle}
                    value={shippingAddress.country || ""}
                  />
                  {/* <MasterDropdown
                    type="Country"
                    value={shippingAddress.country || "United Kingdom"}
                    disabled={isSettingsDisabled}
                    className={inputcolumnDivStyle}
                    onChange={(val) =>
                      setShippingAddress({
                        ...shippingAddress,
                        country: val ?? undefined,
                      })
                    }
                  /> */}
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-2">
              
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Book In Contact</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.book_in_contact || ""}
                  onChange={(e) =>
                    updateField("book_in_contact", e.target.value)
                  }
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Book In Tel No.</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.book_in_phone || ""}
                  onChange={(e) => updateField("book_in_phone", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Book In Email</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.book_in_email || ""}
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
                  value={quote.shipment_method_id || ""}
                  disabled={isReadOnly}
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
                <label className={labelStyle} title="Shipping Agent">
                  Ship. Agent
                </label>

                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={inputStyle}
                    value={quote.shipping_agent || ""}
                    onChange={(e) =>
                      updateField("shipping_agent", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={onShippingAgentSelect}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Shipment Reference No.">
                  Shipt. Ref. No.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.shipment_ref_no || ""}
                  onChange={(e) =>
                    updateField("shipment_ref_no", e.target.value)
                  }
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Freight Charges</label>
                <input
                  type="number"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.freight_charges ?? 0}
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
                    quote.delivery_date
                      ? new Date(quote.delivery_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  minDate={
                    quote.order_date ? new Date(quote.order_date) : undefined
                  }
                  onChange={(date) =>
                    updateField(
                      "delivery_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Delivery Time</label>
                <input
                  type="time"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.delivery_time?.split("T")[0] ?? ""}
                  min={quote.order_date?.split("T")[0] ?? ""}
                  onChange={(e) => updateField("delivery_time", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Warehouse Reference No.">
                  WH. Ref. No.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.warehouse_ref_no || ""}
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
                  Cust. WH. Ref.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={quote.cust_warehouse_ref_no || ""}
                  onChange={(e) =>
                    updateField("cust_warehouse_ref_no", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Attachments TAB ---------------- */}
        {/* {activeTab === "attachments" && quote.id && (
          <AttachmentsTab module="sales_quote" recordId={quote.id} />
        )} */}
      </div>
    </div>
  );
};
