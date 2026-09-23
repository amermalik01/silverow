// /app/components/sales/returns/ReturnFormTabs.tsx

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

type ExtendedMasterData = SalesReturnMasterData & {
  bank_accounts?: BankAccountItem[];
  bankAccounts?: BankAccountItem[];
  payment_terms?: NamedOptionItem[];
  paymentTerms?: NamedOptionItem[];
  payment_methods?: NamedOptionItem[];
  paymentMethods?: NamedOptionItem[];
};

interface ReturnFormTabsProps {
  activeTab: "general" | "invoicing" | "shipping" | "attachments";
  returnOrder: Partial<SalesReturn>;
  primaryAddress: Address;
  setPrimaryAddress: React.Dispatch<React.SetStateAction<Address>>;
  billingAddress: Address;
  setBillingAddress: React.Dispatch<React.SetStateAction<Address>>;
  shippingAddress: Address;
  setShippingAddress: React.Dispatch<React.SetStateAction<Address>>;
  currencyConfig: CurrencyConfig;
  setCurrencyConfig: React.Dispatch<React.SetStateAction<CurrencyConfig>>;
  masterData: SalesReturnMasterData | null;
  updateField: <K extends keyof SalesReturn>(
    field: K,
    value: SalesReturn[K],
  ) => void;
  // setCustomerModalOpen: (open: boolean) => void;
  onGeneralCustomerSelect: () => void;
  onInvoicingCustomerSelect: () => void;
  setLocationModalOpen: (open: boolean) => void;

  //   onPurchaseOrderSelect: () => void;
  onShippingAgentSelect: () => void;
  setSalesPersonModalOpen: () => void;

  labelStyle?: string;
  inputStyle?: string;
  inputDateStyle?: string;
  isReadOnly?: boolean;
}

export const ReturnFormTabs: React.FC<ReturnFormTabsProps> = ({
  activeTab,
  returnOrder,
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

  //   onPurchaseOrderSelect,
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

  const maxReturnDate =
    [
      returnOrder.posting_date,
      returnOrder.dispatch_date,
      returnOrder.delivery_date,
    ]
      .filter(Boolean)
      .map((d) => d!.split("T")[0])
      .sort()[0] ?? "";

  const calculateDueDate = (returnDate: string, days = 0) => {
    if (!returnDate) return "";
    const date = new Date(returnDate);
    date.setDate(date.getDate() + Number(days));
    return date.toISOString().split("T")[0];
  };

  const isSettingsDisabled = isReadOnly || !returnOrder.anonymous_customer;

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
                    value={returnOrder.customer_no || "Click Select..."}
                  />
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={onGeneralCustomerSelect}
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
                  value={returnOrder.customer_name || ""}
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
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={inputStyle}
                    value={returnOrder.salesperson || ""}
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

            {/* Column 4 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Customer Order No.">
                  Cust. Order No.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={returnOrder.cust_return_no || ""}
                  onChange={(e) =>
                    updateField("cust_return_no", e.target.value)
                  }
                />
              </div>
              {/* 

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Original Sales Order No.">
                  Original SO No.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={returnOrder.original_order_no || ""}
                  onChange={(e) =>
                    updateField("original_order_no", e.target.value)
                  }
                />
              </div> */}

              {returnOrder.is_posted && (
                <div className="grid grid-cols-12 items-center gap-2">
                  <label className={labelStyle} title="Credit Note No.">
                    Credit Note No.
                  </label>
                  <input
                    type="text"
                    className={inputStyle}
                    disabled
                    readOnly
                    value={returnOrder.credit_note_no || ""}
                  />
                </div>
              )}
            </div>

            {/* Column 5 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>
                  Posting Date<span className="text-red-500">*</span>
                </label>
                <DatePicker
                  value={
                    returnOrder.posting_date
                      ? new Date(returnOrder.posting_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  minDate={
                    returnOrder.credit_note_date
                      ? new Date(returnOrder.credit_note_date)
                      : undefined
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
                <label className={labelStyle}>Return Date</label>
                <DatePicker
                  value={
                    returnOrder.credit_note_date
                      ? new Date(returnOrder.credit_note_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  maxDate={maxReturnDate ? new Date(maxReturnDate) : undefined}
                  onChange={(date) => {
                    const formattedDate = date
                      ? format(date, "yyyy-MM-dd")
                      : "";
                    updateField("credit_note_date", formattedDate);

                    const selected = paymentTerms.find(
                      (x) => x.id === returnOrder.payment_terms_id,
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
                <label className={labelStyle}>Receipt Date</label>
                <DatePicker
                  value={
                    returnOrder.requested_delivery_date
                      ? new Date(returnOrder.requested_delivery_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  minDate={
                    returnOrder.credit_note_date
                      ? new Date(returnOrder.credit_note_date)
                      : undefined
                  }
                  onChange={(date) =>
                    updateField(
                      "requested_delivery_date",
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
                    value={returnOrder.customer_no || "Click Select..."}
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
                  value={returnOrder.customer_name || ""}
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
                </div>
              </div>
            </div>

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
                <label className={labelStyle}>Currency</label>
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
                  value={returnOrder.receivable_bank || ""}
                  onChange={(e) =>
                    updateField("receivable_bank", e.target.value)
                  }
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
                  value={returnOrder.payment_terms_id ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const selected = paymentTerms.find(
                      (x) => String(x.id) === String(val),
                    );

                    updateField("payment_terms_id", val);
                    updateField("payment_terms", selected?.name || "");

                    if (returnOrder.credit_note_date && selected) {
                      updateField(
                        "due_date",
                        calculateDueDate(
                          returnOrder.credit_note_date,
                          selected.days,
                        ),
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
                  value={
                    returnOrder.due_date
                      ? new Date(returnOrder.due_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  minDate={
                    returnOrder.credit_note_date
                      ? new Date(returnOrder.credit_note_date)
                      : undefined
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
                  value={returnOrder.payment_method_id ?? ""}
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
                  value={returnOrder.finance_charges ?? 0}
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
                  value={returnOrder.insurance_charges ?? 0}
                  onChange={(e) =>
                    updateField("insurance_charges", Number(e.target.value))
                  }
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
                    disabled={isReadOnly || !returnOrder.customer_id}
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
                  value={returnOrder.book_in_contact || ""}
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
                  value={returnOrder.book_in_phone || ""}
                  onChange={(e) => updateField("book_in_phone", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Book In Email</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={returnOrder.book_in_email || ""}
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
                  value={returnOrder.shipment_method_id || ""}
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
                    value={returnOrder.shipping_agent || ""}
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
                  value={returnOrder.shipment_ref_no || ""}
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
                  value={returnOrder.freight_charges ?? 0}
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
                    returnOrder.delivery_date
                      ? new Date(returnOrder.delivery_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  minDate={
                    returnOrder.credit_note_date
                      ? new Date(returnOrder.credit_note_date)
                      : undefined
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
                  value={returnOrder.delivery_time?.split("T")[0] ?? ""}
                  min={returnOrder.credit_note_date?.split("T")[0] ?? ""}
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
                  value={returnOrder.warehouse_ref_no || ""}
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
                  value={returnOrder.cust_warehouse_ref_no || ""}
                  onChange={(e) =>
                    updateField("cust_warehouse_ref_no", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Attachments TAB ---------------- */}
        {activeTab === "attachments" && returnOrder.id && (
          <AttachmentsTab module="sales_return" recordId={returnOrder.id} />
        )}
      </div>
    </div>
  );
};

export default ReturnFormTabs;
