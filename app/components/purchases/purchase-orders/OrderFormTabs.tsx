// app/components/purchases/purchase-orders/OrderFormTabs.tsx

import React from "react";
import { Icon } from "@iconify/react";
import { PurchaseOrder, PurchaseOrderMasterData } from "@/types/purchase-order";
import MasterDropdown from "../../common/MasterDropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
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

type ExtendedMasterData = PurchaseOrderMasterData & {
  bank_accounts?: BankAccountItem[];
  bankAccounts?: BankAccountItem[];
  payment_terms?: NamedOptionItem[];
  payment_methods?: NamedOptionItem[];
  paymentMethods?: NamedOptionItem[];
};

interface OrderFormTabsProps {
  activeTab: "general" | "invoicing" | "shipping" | "attachments";
  order: Partial<PurchaseOrder>;
  primaryAddress: Address;
  setPrimaryAddress: React.Dispatch<React.SetStateAction<Address>>;
  billingAddress: Address;
  setBillingAddress: React.Dispatch<React.SetStateAction<Address>>;
  shippingAddress: Address;
  setShippingAddress: React.Dispatch<React.SetStateAction<Address>>;
  currencyConfig: CurrencyConfig;
  setCurrencyConfig: React.Dispatch<React.SetStateAction<CurrencyConfig>>;
  // currencies: Currency[];
  masterData: PurchaseOrderMasterData | null;
  updateField: <K extends keyof PurchaseOrder>(
    field: K,
    value: PurchaseOrder[K],
  ) => void;

  onGeneralSupplierSelect: () => void;
  onInvoicingSupplierSelect: () => void;
  // setSupplierModalOpen: (open: boolean) => void;
  setLocationModalOpen: (open: boolean) => void;

  onPurchaseOrderSelect: () => void;
  onSalesOrderSelect: () => void;
  onCustomerSelect: () => void;
  onShippingAgentSelect: () => void;

  labelStyle?: string;
  inputStyle?: string;
  inputDateStyle?: string;
  isReadOnly?: boolean;
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
  // setSupplierModalOpen,
  onGeneralSupplierSelect,
  onInvoicingSupplierSelect,
  setLocationModalOpen,

  onPurchaseOrderSelect,
  onSalesOrderSelect,
  onCustomerSelect,
  onShippingAgentSelect,

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

  // const inputcolumnDivStyle = "w-full text-xs px-2 py-1.5 border rounded bg-white border-slate-300 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed";

  // const inputStyle =
  // "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";

  const maxOrderDate =
    [order.invoice_date, order.req_receipt_date, order.receipt_date]
      .filter(Boolean)
      .map((d) => d!.split("T")[0])
      .sort()[0] ?? "";

  const calculateDueDate = (orderDate: string, days = 0) => {
    if (!orderDate) return "";

    const date = new Date(orderDate);
    date.setDate(date.getDate() + Number(days));

    return date.toISOString().split("T")[0];
  };

  // const isSettingsDisabled = !order.anonymous_supplier;
  const isSettingsDisabled = isReadOnly || !order.anonymous_supplier;

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
            {/*  lg:grid-cols-[2fr_1fr_1fr_1fr] gap-4*/}
            {/* Column 1 */}
            <div className="space-y-2">
              {/* <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Order No.</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={order.order_no || order.invoice_no || ""}
              />
            </div> */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Supplier No.">
                  Supplier No. <span className="text-red-500">*</span>
                </label>

                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={`${inputStyle} font-mono`}
                    value={order.supplier_no || "Click Select..."}
                  />
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={onGeneralSupplierSelect}
                    // onClick={() => setSupplierModalOpen(true)}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    {/* <Icon icon="tabler:search" /> */}
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Supplier Name</label>
                <input
                  type="text"
                  disabled={isSettingsDisabled}
                  className={inputStyle}
                  value={order.supplier_name || ""}
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Address Line 1</label>

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
                <label className={labelStyle}>Address Line 2</label>

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

            {/* Column 2 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Contact Person</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isSettingsDisabled}
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
                <label className={labelStyle}>Purchaser</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isSettingsDisabled}
                  value={order.purchaser || ""}
                  onChange={(e) => updateField("purchaser", e.target.value)}
                />
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Supplier Invoice No.">
                  Suppl. Inv. No.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  placeholder="e.g. INV-9932"
                  disabled={isReadOnly}
                  value={order.reference || ""}
                  onChange={(e) => updateField("reference", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Supplier Order No.">
                  Suppl. Ord. No.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={order.supp_order_no || ""}
                  onChange={(e) => updateField("supp_order_no", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Consignment No.">
                  Cons. No.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={order.consignment_no || ""}
                  onChange={(e) =>
                    updateField("consignment_no", e.target.value)
                  }
                />
              </div>

              {order.invoice_no && (
                <div className="grid grid-cols-12 items-center gap-2">
                  <label className={labelStyle} title="Consignment No.">
                    Order No.
                  </label>
                  <input
                    type="text"
                    className={inputStyle}
                    disabled={isReadOnly}
                    value={order.purchase_order_no || ""}
                  />
                </div>
              )}
              {/* <div className="bg-[#0b3310] text-white shadow-sm gap-1.5 px-2 py-0.5 transition-colors rounded">
            {`Invoice/Order No. ${invoice.invoice_no || ""}/${invoice.purchase_order_no || ""}`}
          </div> */}
            </div>

            {/* Column 4 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Invoice Date</label>

                <DatePicker
                  value={
                    order.invoice_date
                      ? new Date(order.invoice_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  minDate={
                    order.order_date ? new Date(order.order_date) : undefined
                  }
                  disabled={isReadOnly}
                  onChange={(date) =>
                    updateField(
                      "invoice_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Order Date</label>

                <DatePicker
                  value={
                    order.order_date ? new Date(order.order_date) : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  maxDate={maxOrderDate ? new Date(maxOrderDate) : undefined}
                  onChange={(date) => {
                    const formattedDate = date
                      ? format(date, "yyyy-MM-dd")
                      : "";

                    // Fix: updated order_date instead of invoice_date
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
                <label className={labelStyle}>Req. Rcpt. Date</label>

                <DatePicker
                  value={
                    order.req_receipt_date
                      ? new Date(order.req_receipt_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  minDate={
                    order.order_date ? new Date(order.order_date) : undefined
                  }
                  onChange={(date) =>
                    updateField(
                      "req_receipt_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />

                {/* <input
                type="date"
                className={inputStyle}
                value={order.req_receipt_date?.split("T")[0] ?? ""}
                min={order.order_date?.split("T")[0] ?? ""}
                onChange={(e) =>
                  updateField("req_receipt_date", e.target.value)
                }
              /> */}
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Receipt Date</label>
                <DatePicker
                  value={
                    order.receipt_date
                      ? new Date(order.receipt_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  minDate={
                    order.order_date ? new Date(order.order_date) : undefined
                  }
                  onChange={(date) =>
                    updateField(
                      "receipt_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
                {/* <input
                type="date"
                className={inputStyle}
                value={order.receipt_date?.split("T")[0] ?? ""}
                min={
                  order.req_receipt_date?.split("T")[0] ??
                  order.order_date?.split("T")[0] ??
                  ""
                }
                onChange={(e) => updateField("receipt_date", e.target.value)}
              /> */}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- INVOICING TAB ---------------- */}
        {activeTab === "invoicing" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 space-x-2 gap-4 ">
            {/* lg:grid-cols-4 gap-4 space-x-2 */}
            {/* Column 1 */}
            <div className="space-y-2 ">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Pay to Supplier No.">
                  Pay to Suppl. No.
                </label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={`${inputStyle} font-mono`}
                    value={order.pay_to_supplier_no || "Click Select..."}
                  />
                  <button
                    type="button"
                    disabled={isReadOnly}
                    // onClick={() => setSupplierModalOpen(true)}
                    onClick={onInvoicingSupplierSelect}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Supplier Name</label>
                <input
                  type="text"
                  disabled={isSettingsDisabled}
                  className={inputStyle}
                  value={order.pay_to_supplier_name || ""}
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Address Line 1</label>
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
                <label className={labelStyle}>Address Line 2</label>
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
                <div className="col-span-8 flex gap-1">
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
                  Currency <span className="text-red-500">*</span>
                </label>
                <select
                  disabled={isSettingsDisabled}
                  className={selectStyle}
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

            {/* Column 4 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Payable Bank</label>
                <select
                  disabled={isReadOnly}
                  className={inputStyle}
                  value={order.payable_bank || ""}
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
                <label className={labelStyle}>Payment Terms</label>

                <select
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={order.payment_terms_id ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const selected = paymentTerms.find(
                      (x) => String(x.id) === String(val),
                    );

                    updateField("payment_terms_id", val);
                    updateField("payment_terms", selected?.name || "");

                    if (order.order_date && selected) {
                      updateField(
                        "due_date",
                        calculateDueDate(order.order_date, selected.days),
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
                  value={order.due_date ? new Date(order.due_date) : undefined}
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  onChange={(date) =>
                    updateField(
                      "due_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Payment Method</label>

                <select
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={order.payment_method_id ?? ""}
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

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Deduct from Rebate">
                  {/* Ded. from Rebate */}Rebate Ded.
                </label>
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={!!order.deduct_from_rebate}
                  onChange={(e) =>
                    updateField("deduct_from_rebate", e.target.checked)
                  }
                  className="rounded bg-white/20 border-0 text-emerald-700 h-3.5 w-3.5"
                />
              </div>
            </div>

            {/* Column 5 */}
            <div className="space-y-2 bg-slate-100 dark:bg-slate-800/80 py-1 px-2 rounded-xl shadow-sm">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Link to Customer">
                  Link to Cust.
                </label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={inputStyle}
                    value={order.link_to_cust || ""}
                    onChange={(e) =>
                      updateField("link_to_cust", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={onCustomerSelect}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Link to SO No.">
                  Link to SO No.
                </label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={inputStyle}
                    value={order.link_to_so_no || ""}
                    onChange={(e) =>
                      updateField("link_to_so_no", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={onSalesOrderSelect}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Linked PO</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={inputStyle}
                    value={order.linked_po || ""}
                    onChange={(e) => updateField("linked_po", e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={onPurchaseOrderSelect}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- SHIPPING TAB ---------------- */}
        {activeTab === "shipping" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 space-x-2 gap-4">
            {/* lg:grid-cols-4 space-x-2 */}
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
                    disabled={isReadOnly || !order.supplier_id}
                    onClick={() => setLocationModalOpen(true)}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Address Line 1</label>
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
                <label className={labelStyle}>Address Line 2</label>
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
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Postcode/Co.</label>
                <div className="col-span-8 flex gap-1">
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
            </div>

            {/* Column 2 */}
            <div className="space-y-2">
              {/* <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Contact</label>
              <input
                type="text"
                className={inputStyle}
                value={order.contact || ""}
                onChange={(e) => updateField("contact", e.target.value)}
              />
            </div> */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Book In Contact</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={order.book_in_contact || ""}
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
                  value={order.book_in_phone || ""}
                  onChange={(e) => updateField("book_in_phone", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Book In Email</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
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
                <label className={labelStyle}>Shipping Agent</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={inputStyle}
                    value={order.shipping_agent || ""}
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
                  value={order.shipment_ref_no || ""}
                  onChange={(e) =>
                    updateField("shipment_ref_no", e.target.value)
                  }
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Warehouse Reference No.">
                  Warehouse Ref.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={order.warehouse_ref_no || ""}
                  onChange={(e) =>
                    updateField("warehouse_ref_no", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Attachments TAB ---------------- */}
        {activeTab === "attachments" && order.id && (
          <AttachmentsTab
            module="purchase_order"
            recordId={order.id}
            // readonly={isSettingsDisabled}
          />
        )}
      </div>
    </div>
  );
};
